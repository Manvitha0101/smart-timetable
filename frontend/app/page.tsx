'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatPanel from '@/components/ChatPanel';
import {
  Calendar, BookOpen, Clock, Zap, TrendingUp, AlertTriangle,
  GraduationCap, ChevronRight, Star,
} from 'lucide-react';
import { analyticsApi, eventsApi, assignmentsApi, CalendarEvent, Assignment, Overview } from '@/lib/api';
import { format, formatDistanceToNow, isToday, isTomorrow } from 'date-fns';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export default function DashboardPage() {
  const { user } = useAuth();
  const displayName = user?.name?.split(' ')[0] ?? 'Student';
  const [overview, setOverview] = useState<Overview | null>(null);
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart.getTime() + 86400000);

        const [ovRes, evRes, asRes] = await Promise.all([
          analyticsApi.getOverview(),
          eventsApi.getAll({
            start: todayStart.toISOString(),
            end: new Date(now.getTime() + 7 * 86400000).toISOString(),
          }),
          assignmentsApi.getAll({ status: 'pending' }),
        ]);
        setOverview(ovRes.data);
        setTodayEvents(evRes.data.filter((e) => isToday(new Date(e.start_time))));
        setAssignments(asRes.data.slice(0, 5));
      } catch (e) {
        console.error('Backend not reachable — ensure FastAPI is running on port 8000', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const statCards = [
    {
      label: "Today's Events", value: overview?.today_events ?? '—',
      icon: Calendar, color: '#6C63FF', bg: 'rgba(108,99,255,0.12)',
    },
    {
      label: 'Upcoming Exams', value: overview?.upcoming_exams ?? '—',
      icon: AlertTriangle, color: '#FF6584', bg: 'rgba(255,101,132,0.12)',
    },
    {
      label: 'Pending Assignments', value: overview?.pending_assignments ?? '—',
      icon: BookOpen, color: '#FFB648', bg: 'rgba(255,182,72,0.12)',
    },
    {
      label: 'Study Hours (Week)', value: overview?.study_hours_this_week ?? '—',
      icon: Clock, color: '#43D9AD', bg: 'rgba(67,217,173,0.12)',
    },
  ];

  const EVENT_TYPE_COLORS: Record<string, string> = {
    class: '#6C63FF', exam: '#FF6584', study: '#43D9AD',
    assignment: '#FFB648', personal: '#A78BFA',
  };
  const PRIORITY_COLORS: Record<string, string> = {
    high: '#FF6584', medium: '#FFB648', low: '#43D9AD',
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: '32px 36px', maxWidth: 1200 }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #6C63FF, #FF6584)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <GraduationCap size={24} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>
                Good {getGreeting()}, {displayName}! 👋
              </h1>
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                {format(new Date(), "EEEE, MMMM d, yyyy")} • Let's make today productive
              </p>
            </div>
          </div>
        </div>

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          {statCards.map(({ label, value, icon: Icon, color, bg }) => (
            <div
              key={label}
              className="glass-card"
              style={{ padding: '20px 22px', transition: 'transform 0.2s', cursor: 'default' }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1.1 }}>
                    {loading ? '...' : String(value)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>
                    {label}
                  </div>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} color={color} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
          {/* Today's Schedule */}
          <div className="glass-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={18} color="var(--primary)" /> Today's Schedule
              </h2>
              <Link href="/calendar" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>
                View all <ChevronRight size={14} />
              </Link>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1, 2, 3].map((i) => <div key={i} className="shimmer" style={{ height: 60, borderRadius: 10 }} />)}
              </div>
            ) : todayEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✨</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>No events today! Enjoy your free day.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {todayEvents.map((event) => (
                  <div key={event.id}
                    style={{
                      display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 12,
                      background: 'var(--surface-3)', borderLeft: `3px solid ${event.color}`,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface-3)')}
                  >
                    <div style={{ minWidth: 50, textAlign: 'center', paddingTop: 2 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: event.color }}>
                        {format(new Date(event.start_time), 'h:mm')}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                        {format(new Date(event.start_time), 'a')}
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {event.title}
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          {format(new Date(event.start_time), 'h:mm a')} – {format(new Date(event.end_time), 'h:mm a')}
                        </span>
                        {event.location && (
                          <span style={{ fontSize: 10, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            📍 {event.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Assignments */}
          <div className="glass-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <BookOpen size={18} color="var(--warning)" /> Upcoming Deadlines
              </h2>
              <Link href="/assignments" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>
                View all <ChevronRight size={14} />
              </Link>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1, 2, 3].map((i) => <div key={i} className="shimmer" style={{ height: 52, borderRadius: 10 }} />)}
              </div>
            ) : assignments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>All caught up! No pending assignments.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {assignments.map((a) => {
                  const daysLeft = Math.max(0, Math.ceil((new Date(a.due_date).getTime() - Date.now()) / 86400000));
                  return (
                    <div key={a.id}
                      style={{
                        padding: '12px 14px', borderRadius: 12,
                        background: 'var(--surface-3)', transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--surface-3)')}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', flex: 1, marginRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.title}
                        </div>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                          background: `${PRIORITY_COLORS[a.priority]}22`,
                          color: PRIORITY_COLORS[a.priority], flexShrink: 0,
                        }}>
                          {a.priority.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>📖 {a.subject}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: daysLeft <= 2 ? '#FF6584' : daysLeft <= 5 ? '#FFB648' : '#43D9AD' }}>
                          {daysLeft === 0 ? '🔴 Due today!' : daysLeft === 1 ? '🟡 Due tomorrow' : `⏰ ${daysLeft}d left`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glass-card" style={{ padding: 24, marginTop: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={18} color="var(--warning)" /> Quick Actions
          </h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { label: '📅 Open Calendar', href: '/calendar', color: '#6C63FF' },
              { label: '🤖 Ask AcadeBot', href: '/chat', color: '#A78BFA' },
              { label: '📊 View Analytics', href: '/analytics', color: '#43D9AD' },
              { label: '📋 Add Assignment', href: '/assignments', color: '#FFB648' },
            ].map(({ label, href, color }) => (
              <Link
                key={href}
                href={href}
                style={{
                  padding: '10px 20px', borderRadius: 12, textDecoration: 'none',
                  background: `${color}15`, border: `1px solid ${color}33`,
                  color, fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${color}25`; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = `${color}15`; }}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </main>
      <ChatPanel />
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}
