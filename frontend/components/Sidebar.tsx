'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  BarChart3,
  MessageSquareText,
  GraduationCap,
  Settings,
  LogIn,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

const NAV_ITEMS = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/calendar', icon: Calendar, label: 'Calendar' },
  { href: '/assignments', icon: BookOpen, label: 'Assignments' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/chat', icon: MessageSquareText, label: 'AI Chat' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <aside
      style={{
        width: 220,
        minHeight: '100vh',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
        padding: '0 12px',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '24px 12px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #6C63FF, #FF6584)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <GraduationCap size={20} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
              AcadeBot
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>
              Smart Timetable
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, paddingTop: 16 }}>
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 10,
                marginBottom: 4,
                textDecoration: 'none',
                fontWeight: 500,
                fontSize: 14,
                color: active ? 'white' : 'var(--text-muted)',
                background: active
                  ? 'linear-gradient(135deg, var(--primary), #8B85FF)'
                  : 'transparent',
                boxShadow: active ? '0 4px 15px rgba(108,99,255,0.3)' : 'none',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text)';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                }
              }}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User / Auth */}
      <div style={{ margin: '16px 0', padding: '12px', borderRadius: 12, background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
        {user && !user.is_demo ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: user.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white' }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{user.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{user.email}</div>
              </div>
            </div>
          </>
        ) : (
          <Link href="/login" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'var(--primary)', fontSize: 12, fontWeight: 600 }}>
            <LogIn size={14} /> Sign in / Register
          </Link>
        )}
      </div>
    </aside>
  );
}
