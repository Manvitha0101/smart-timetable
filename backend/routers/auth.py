"""
Auth Router
Endpoints: /auth/register, /auth/login, /auth/logout,
           /auth/me, /auth/me (PUT), /auth/refresh, /auth/change-password
"""

import uuid
import hashlib
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response, Request, status, Cookie
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.database import User, RefreshToken, get_db
from models.schemas import (
    UserCreate, UserLogin, UserResponse, UserUpdate,
    PasswordChange, TokenResponse,
)
from services.auth_service import (
    hash_password, verify_password, validate_password_strength,
    create_access_token, create_refresh_token,
    get_current_user, REFRESH_TOKEN_EXPIRE_DAYS,
    decode_access_token,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

AVATAR_COLORS = [
    "#6C63FF", "#FF6584", "#43D9AD", "#FFB648",
    "#A78BFA", "#38BDF8", "#F97316", "#10B981",
]


# ─── Register ─────────────────────────────────────────────────────────────────
@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(
    body: UserCreate,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    # Check duplicate email
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    # Create user
    user_id = str(uuid.uuid4())
    color = AVATAR_COLORS[sum(ord(c) for c in body.email) % len(AVATAR_COLORS)]

    user = User(
        id=user_id,
        email=body.email,
        name=body.name.strip(),
        hashed_password=hash_password(body.password),
        institution=body.institution,
        semester=body.semester,
        avatar_color=color,
        created_at=datetime.utcnow(),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Issue tokens
    access_token = create_access_token(user.id, user.email, user.name)
    raw_refresh, refresh_hash = create_refresh_token(user.id)

    rt = RefreshToken(
        id=str(uuid.uuid4()),
        user_id=user.id,
        token_hash=refresh_hash,
        expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(rt)
    await db.commit()

    # Set refresh token as httpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=raw_refresh,
        httponly=True,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        samesite="none",
        secure=True,
    )

    return TokenResponse(access_token=access_token, user=UserResponse.model_validate(user))


# ─── Login ────────────────────────────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
async def login(
    body: UserLogin,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == body.email.lower().strip()))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated. Contact support.")

    # Update last login
    user.last_login = datetime.utcnow()
    await db.commit()

    # Issue tokens
    access_token = create_access_token(user.id, user.email, user.name)
    raw_refresh, refresh_hash = create_refresh_token(user.id)

    rt = RefreshToken(
        id=str(uuid.uuid4()),
        user_id=user.id,
        token_hash=refresh_hash,
        expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(rt)
    await db.commit()

    response.set_cookie(
        key="refresh_token",
        value=raw_refresh,
        httponly=True,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        samesite="none",
        secure=True,
    )

    return TokenResponse(access_token=access_token, user=UserResponse.model_validate(user))


# ─── Logout ───────────────────────────────────────────────────────────────────
@router.post("/logout")
async def logout(
    response: Response,
    refresh_token: Optional[str] = Cookie(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if refresh_token:
        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        rt_result = await db.execute(
            select(RefreshToken).where(
                RefreshToken.token_hash == token_hash,
                RefreshToken.user_id == current_user.id,
            )
        )
        rt = rt_result.scalar_one_or_none()
        if rt:
            rt.is_revoked = True
            await db.commit()

    response.delete_cookie(
        "refresh_token",
        samesite="none",
        secure=True,
    )
    return {"message": "Logged out successfully."}


# ─── Refresh Token ────────────────────────────────────────────────────────────
@router.post("/refresh", response_model=TokenResponse)
async def refresh_token_endpoint(
    response: Response,
    refresh_token: Optional[str] = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token provided.")

    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    rt_result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    rt = rt_result.scalar_one_or_none()

    if not rt or rt.is_revoked or rt.expires_at < datetime.utcnow():
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token. Please log in again.")

    # Get user
    user_result = await db.execute(select(User).where(User.id == rt.user_id))
    user = user_result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found.")

    # Rotate refresh token (invalidate old, create new)
    rt.is_revoked = True

    new_access = create_access_token(user.id, user.email, user.name)
    raw_new_refresh, new_hash = create_refresh_token(user.id)

    new_rt = RefreshToken(
        id=str(uuid.uuid4()),
        user_id=user.id,
        token_hash=new_hash,
        expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(new_rt)
    await db.commit()

    response.set_cookie(
        key="refresh_token",
        value=raw_new_refresh,
        httponly=True,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        samesite="none",
        secure=True,
    )

    return TokenResponse(access_token=new_access, user=UserResponse.model_validate(user))


# ─── Get Profile ──────────────────────────────────────────────────────────────
@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


# ─── Update Profile ───────────────────────────────────────────────────────────
@router.put("/me", response_model=UserResponse)
async def update_me(
    body: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.name is not None:
        current_user.name = body.name.strip()
    if body.institution is not None:
        current_user.institution = body.institution
    if body.semester is not None:
        current_user.semester = body.semester
    if body.avatar_color is not None:
        current_user.avatar_color = body.avatar_color

    await db.commit()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)


# ─── Change Password ──────────────────────────────────────────────────────────
@router.post("/change-password")
async def change_password(
    body: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    is_valid, err = validate_password_strength(body.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=err)

    current_user.hashed_password = hash_password(body.new_password)
    await db.commit()
    return {"message": "Password updated successfully."}
