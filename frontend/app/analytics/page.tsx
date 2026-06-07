'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatPanel from '@/components/ChatPanel';
import { analyticsApi, WeeklyStats } from '@/lib/api';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { BarChart3, TrendingUp, Clock, Zap, Target, BookOpen } from 'lucide-react';

export default function AnalyticsPage() {
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [subjectHours, setSubjectHours] = useState<any[]>([]);
  const [dailyHours, setDailyHours] = useState<any[]>([]);
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [wRes, sRes, dRes, dlRes] = await Promise.all([
          analyticsApi.getWeekly(),
          analyticsApi.getSubjectHours(30),
          analyticsApi.getDailyHours(14),
          analyticsApi.getUpcomingDeadlines(14),
        ]);
        setStats(wRes.data);
        setSubjectHours(sRes.data);
        setDailyHours(dRes.data);
        setDeadlines(dlRes.data);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const productivityColor =
    (stats?.productivity_score ?? 0) >= 70 ? '#43D9AD' :
    (stats?.productivity_score ?? 0) >= 40 ? '#FFB648' : '#FF6584';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: 'var(--surface-3)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '10px 14px', fontSize: 12,
      }}>
        <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{label}</div>
        {payload.map((p: any) => (
          <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
            {p.name}: <strong>{p.value}h</strong>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: '28px 32px', maxWidth: 1300 }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <BarChart3 size={24} color="var(--success)" /> Analytics
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Your academic time management insights
          </p>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="shimmer" style={{ height: 120, borderRadius: 14 }} />)}
          </div>
        ) : (
          <>
            {/* KPI Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 28 }}>
              {[
                { label: 'Scheduled', value: `${stats?.total_scheduled_hours}h`, icon: Clock, color: '#6C63FF' },
                { label: 'Study Time', value: `${stats?.study_hours}h`, icon: BookOpen, color: '#43D9AD' },
                { label: 'Class Time', value: `${stats?.class_hours}h`, icon: Target, color: '#FFB648' },
                { label: 'Free Time', value: `${stats?.free_hours}h`, icon: Zap, color: '#A78BFA' },
                { label: 'Deadlines', value: stats?.upcoming_deadlines, icon: TrendingUp, color: '#FF6584' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="glass-card" style={{ padding: '16px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{label}</div>
                    </div>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={17} color={color} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Productivity Score */}
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, marginBottom: 24 }}>
              <div className="glass-card" style={{ padding: 24, textAlign: 'center' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Productivity Score</h3>
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
                  <svg width={140} height={140} viewBox="0 0 140 140">
                    <circle cx={70} cy={70} r={55} fill="none" stroke="var(--surface-3)" strokeWidth={14} />
                    <circle cx={70} cy={70} r={55} fill="none" stroke={productivityColor} strokeWidth={14}
                      strokeDasharray={`${2 * Math.PI * 55 * (stats?.productivity_score ?? 0) / 100} ${2 * Math.PI * 55}`}
                      strokeLinecap="round" transform="rotate(-90 70 70)"
                      style={{ transition: 'stroke-dasharray 1s ease' }} />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 30, fontWeight: 800, color: productivityColor }}>{stats?.productivity_score}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>/ 100</span>
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: productivityColor }}>
                  {(stats?.productivity_score ?? 0) >= 70 ? ' Excellent!' : (stats?.productivity_score ?? 0) >= 40 ? ' Good Progress' : ' Needs Improvement'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                  Busiest day: <strong style={{ color: 'var(--text)' }}>{stats?.busiest_day}</strong>
                </div>
              </div>

              {/* Subject Hours Pie */}
              <div className="glass-card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Study Hours by Subject (Last 30 Days)</h3>
                {subjectHours.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 180, color: 'var(--text-muted)', fontSize: 14 }}>No data yet</div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                    <ResponsiveContainer width={180} height={180}>
                      <PieChart>
                        <Pie data={subjectHours} cx="50%" cy="50%" innerRadius={45} outerRadius={80}
                          dataKey="hours" nameKey="subject" paddingAngle={2}>
                          {subjectHours.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ flex: 1 }}>
                      {subjectHours.map((s) => (
                        <div key={s.subject} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                            <span style={{ fontSize: 12, color: 'var(--text)' }}>{s.subject}</span>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.hours}h</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Daily Hours Bar Chart */}
            <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Daily Schedule Breakdown (Last 14 Days)</h3>
              {dailyHours.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--text-muted)' }}>No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dailyHours} barSize={16}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} unit="h" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)', paddingTop: 12 }} />
                    <Bar dataKey="class" name="Class" stackId="a" fill="#6C63FF" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="study" name="Study" stackId="a" fill="#43D9AD" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="exam" name="Exam" stackId="a" fill="#FF6584" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Upcoming Deadlines */}
            {deadlines.length > 0 && (
              <div className="glass-card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Deadline Pressure (Next 14 Days)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {deadlines.map((d: any) => (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ minWidth: 36, fontSize: 11, fontWeight: 700, color: d.days_left <= 2 ? '#FF6584' : d.days_left <= 5 ? '#FFB648' : '#43D9AD', textAlign: 'center' }}>
                        {d.days_left}d
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>{d.title}</div>
                        <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-3)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 3,
                            width: `${Math.max(5, 100 - (d.days_left / 14) * 100)}%`,
                            background: d.days_left <= 2 ? '#FF6584' : d.days_left <= 5 ? '#FFB648' : '#43D9AD',
                            transition: 'width 0.5s ease',
                          }} />
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 60, textAlign: 'right' }}>
                        {d.estimated_hours}h est.
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
      <ChatPanel />
    </div>
  );
}
