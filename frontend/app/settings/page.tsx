'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatPanel from '@/components/ChatPanel';
import { useAuth } from '@/lib/auth';
import { googleApi, remindersApi } from '@/lib/api';
import { Settings, Link2, Bell, User, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { user, logout, refreshUser, token } = useAuth();
  const router = useRouter();
  const [googleStatus, setGoogleStatus] = useState<{ configured: boolean; connected: boolean } | null>(null);
  const [reminderStatus, setReminderStatus] = useState<{ email_configured: boolean } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    googleApi.getStatus().then((r) => setGoogleStatus(r.data)).catch(() => {});
    remindersApi.getStatus().then((r) => setReminderStatus(r.data)).catch(() => {});
  }, [token]);

  const handleGoogleConnect = async () => {
    try {
      const res = await googleApi.getAuthUrl();
      window.location.href = res.data.auth_url;
    } catch {
      setMessage('Google Calendar not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to backend .env');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await googleApi.sync();
      setMessage(res.data.message);
    } catch {
      setMessage('Sync failed. Make sure Google Calendar is connected.');
    }
    setSyncing(false);
  };

  const handleDisconnect = async () => {
    await googleApi.disconnect();
    setGoogleStatus((s) => s ? { ...s, connected: false } : s);
    setMessage('Google Calendar disconnected.');
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: '28px 32px', maxWidth: 700 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <Settings size={24} /> Settings
        </h1>

        {message && (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(108,99,255,0.12)', color: 'var(--primary)', fontSize: 13, marginBottom: 20 }}>
            {message}
          </div>
        )}

        {/* Profile */}
        <section className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <User size={16} /> Profile
          </h2>
          {user ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.8 }}>
              <div><strong style={{ color: 'var(--text)' }}>{user.name}</strong></div>
              <div>{user.email}</div>
              {user.institution && <div>{user.institution} · {user.semester}</div>}
              {user.is_demo && <div style={{ color: '#FFB648', marginTop: 6 }}>Using demo account — register to save your own data</div>}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Browsing as demo user. <a href="/login" style={{ color: 'var(--primary)' }}>Sign in</a> or <a href="/register" style={{ color: 'var(--primary)' }}>register</a>.</p>
          )}
          {user && !user.is_demo && (
            <button onClick={handleLogout} style={{ marginTop: 14, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--secondary)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <LogOut size={14} /> Sign Out
            </button>
          )}
        </section>

        {/* Google Calendar */}
        <section className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Link2 size={16} /> Google Calendar
          </h2>
          {googleStatus ? (
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                {googleStatus.configured
                  ? googleStatus.connected ? ' Connected' : 'Not connected'
                  : '️ Not configured — add Google OAuth credentials to backend .env'}
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                {googleStatus.configured && !googleStatus.connected && (
                  <button onClick={handleGoogleConnect} style={btnStyle}>Connect Google Calendar</button>
                )}
                {googleStatus.connected && (
                  <>
                    <button onClick={handleSync} disabled={syncing} style={btnStyle}>{syncing ? 'Syncing...' : 'Import Events'}</button>
                    <button onClick={handleDisconnect} style={outlineBtn}>Disconnect</button>
                  </>
                )}
              </div>
            </div>
          ) : <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading...</p>}
        </section>

        {/* Email Reminders */}
        <section className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Bell size={16} /> Email Reminders
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {reminderStatus?.email_configured
              ? ' SMTP configured. Reminders are sent 1 day, 2 hours, and 30 minutes before events when you schedule them from the calendar.'
              : '️ Add SMTP_USER and SMTP_PASSWORD to backend .env to enable email reminders. The scheduler still runs and logs reminders in demo mode.'}
          </p>
        </section>
      </main>
      <ChatPanel />
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '9px 16px', borderRadius: 10, border: 'none',
  background: 'linear-gradient(135deg, #6C63FF, #A78BFA)',
  color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer',
};
const outlineBtn: React.CSSProperties = {
  padding: '9px 16px', borderRadius: 10, border: '1px solid var(--border)',
  background: 'transparent', color: 'var(--text-muted)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
};
