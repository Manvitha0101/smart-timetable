'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatPanel from '@/components/ChatPanel';
import { assignmentsApi, Assignment } from '@/lib/api';
import { BookOpen, Plus, Trash2, Check, Clock, AlertTriangle, Zap } from 'lucide-react';
import { format } from 'date-fns';

const PRIORITY_CONFIG = {
  high: { color: '#FF6584', bg: 'rgba(255,101,132,0.12)', label: '🔴 High' },
  medium: { color: '#FFB648', bg: 'rgba(255,182,72,0.12)', label: '🟡 Medium' },
  low: { color: '#43D9AD', bg: 'rgba(67,217,173,0.12)', label: '🟢 Low' },
};

const STATUS_CONFIG = {
  pending: { color: '#FFB648', label: 'Pending' },
  in_progress: { color: '#6C63FF', label: 'In Progress' },
  completed: { color: '#43D9AD', label: 'Done' },
};

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [studyPlan, setStudyPlan] = useState<any[] | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '', subject: '', description: '',
    due_date: '', priority: 'medium', estimated_hours: 2,
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await assignmentsApi.getAll(
        filterStatus !== 'all' ? { status: filterStatus } : undefined
      );
      setAssignments(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterStatus]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.subject || !form.due_date) return;
    try {
      await assignmentsApi.create({
        ...form,
        due_date: new Date(form.due_date).toISOString(),
        estimated_hours: Number(form.estimated_hours),
      });
      setForm({ title: '', subject: '', description: '', due_date: '', priority: 'medium', estimated_hours: 2 });
      setShowForm(false);
      load();
    } catch {}
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    await assignmentsApi.update(id, { status: status as any });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this assignment?')) return;
    setError('');
    const prev = assignments;
    setAssignments((list) => list.filter((a) => a.id !== id));
    try {
      await assignmentsApi.delete(id);
    } catch {
      setAssignments(prev);
      setError('Failed to delete assignment. Make sure the backend is running.');
    }
  };

  const handleStudyPlan = async () => {
    setPlanLoading(true);
    setError('');
    try {
      const res = await assignmentsApi.getStudyPlan(7);
      setStudyPlan(res.data.sessions);
    } catch {
      setError('Could not generate study plan.');
    }
    setPlanLoading(false);
  };

  const handleApplyStudyPlan = async () => {
    setPlanLoading(true);
    setError('');
    try {
      const res = await assignmentsApi.applyStudyPlan(7);
      setStudyPlan(res.data.sessions);
      setError(`Added ${res.data.created} study sessions to your calendar!`);
    } catch {
      setError('Failed to apply study plan to calendar.');
    }
    setPlanLoading(false);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: '28px 32px', maxWidth: 1100 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <BookOpen size={24} color="var(--warning)" /> Assignments
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              {assignments.length} assignments • Track deadlines and priorities
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleStudyPlan}
              disabled={planLoading}
              style={{
                padding: '9px 16px', borderRadius: 10, border: '1px solid rgba(67,217,173,0.3)',
                background: 'rgba(67,217,173,0.1)', color: '#43D9AD',
                cursor: 'pointer', fontWeight: 600, fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Zap size={14} /> {planLoading ? 'Planning...' : 'Auto Study Plan'}
            </button>
            <button
              id="add-assignment-btn"
              onClick={() => setShowForm(!showForm)}
              style={{
                padding: '9px 18px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #FFB648, #FB923C)',
                color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Plus size={16} /> Add Assignment
            </button>
          </div>
        </div>

        {/* Add Form */}
        {showForm && (
          <div className="glass-card fade-in" style={{ padding: 24, marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>New Assignment</h3>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <input placeholder="Assignment title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required style={inputStyle} />
                <input placeholder="Subject *" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required style={inputStyle} />
                <input type="datetime-local" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} required style={{ ...inputStyle, colorScheme: 'dark' }} />
                <input type="number" placeholder="Est. hours" min={0.5} max={100} step={0.5} value={form.estimated_hours} onChange={(e) => setForm({ ...form, estimated_hours: Number(e.target.value) })} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                {(['high', 'medium', 'low'] as const).map((p) => (
                  <button key={p} type="button" onClick={() => setForm({ ...form, priority: p })}
                    style={{
                      padding: '6px 14px', borderRadius: 20, border: `2px solid ${form.priority === p ? PRIORITY_CONFIG[p].color : 'var(--border)'}`,
                      background: form.priority === p ? PRIORITY_CONFIG[p].bg : 'var(--surface-3)',
                      color: form.priority === p ? PRIORITY_CONFIG[p].color : 'var(--text-muted)',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}>
                    {PRIORITY_CONFIG[p].label}
                  </button>
                ))}
              </div>
              <textarea placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical', marginBottom: 14, display: 'block', width: '100%' }} />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowForm(false)} style={cancelBtnStyle}>Cancel</button>
                <button type="submit" style={primaryBtnStyle}>Add Assignment</button>
              </div>
            </form>
          </div>
        )}

        {/* Study Plan */}
        {studyPlan && (
          <div className="glass-card fade-in" style={{ padding: 24, marginBottom: 24, borderColor: 'rgba(67,217,173,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#43D9AD', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={16} /> Pomodoro Study Plan ({studyPlan.length} sessions)
              </h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={handleApplyStudyPlan} disabled={planLoading} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#43D9AD', color: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  Add to Calendar
                </button>
                <button onClick={() => setStudyPlan(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>×</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
              {studyPlan.slice(0, 8).map((s: any, i: number) => (
                <div key={i} style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(67,217,173,0.08)', border: '1px solid rgba(67,217,173,0.2)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#43D9AD', marginBottom: 4 }}>{s.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {format(new Date(s.start_time), 'EEE MMM d, h:mm a')} – {format(new Date(s.end_time), 'h:mm a')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 16, background: error.includes('Added') ? 'rgba(67,217,173,0.12)' : 'rgba(255,101,132,0.12)', color: error.includes('Added') ? '#43D9AD' : '#FF6584', fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          {[['all', 'All'], ['pending', 'Pending'], ['in_progress', 'In Progress'], ['completed', 'Completed']].map(([val, label]) => (
            <button key={val} onClick={() => setFilterStatus(val)}
              style={{
                padding: '6px 16px', borderRadius: 20, border: `1px solid ${filterStatus === val ? 'var(--primary)' : 'var(--border)'}`,
                background: filterStatus === val ? 'rgba(108,99,255,0.15)' : 'var(--surface-3)',
                color: filterStatus === val ? 'var(--primary)' : 'var(--text-muted)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Assignment List */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map((i) => <div key={i} className="shimmer" style={{ height: 90, borderRadius: 14 }} />)}
          </div>
        ) : assignments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>All clear!</div>
            <div style={{ color: 'var(--text-muted)' }}>No {filterStatus !== 'all' ? filterStatus : ''} assignments found.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {assignments.map((a) => {
              const daysLeft = Math.ceil((new Date(a.due_date).getTime() - Date.now()) / 86400000);
              const pCfg = PRIORITY_CONFIG[a.priority];
              const sCfg = STATUS_CONFIG[a.status];

              return (
                <div key={a.id} className="glass-card" style={{ padding: '18px 22px', transition: 'transform 0.2s', borderLeft: `4px solid ${pCfg.color}` }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateX(2px)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateX(0)')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{a.title}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: pCfg.bg, color: pCfg.color }}>{pCfg.label}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${sCfg.color}22`, color: sCfg.color }}>{sCfg.label}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>📖 {a.subject}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={11} /> {a.estimated_hours}h estimated
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: daysLeft <= 0 ? '#FF6584' : daysLeft <= 2 ? '#FF6584' : daysLeft <= 5 ? '#FFB648' : '#43D9AD' }}>
                          {daysLeft <= 0 ? '🔴 OVERDUE' : daysLeft === 1 ? '🟡 Due tomorrow' : `⏰ Due in ${daysLeft}d (${format(new Date(a.due_date), 'MMM d')})`}
                        </span>
                      </div>
                      {a.description && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6, lineHeight: 1.4 }}>{a.description}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                      {a.status !== 'completed' && (
                        <button onClick={() => handleStatusUpdate(a.id, a.status === 'pending' ? 'in_progress' : 'completed')}
                          style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: 'rgba(67,217,173,0.15)', color: '#43D9AD', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                          {a.status === 'pending' ? 'Start' : '✓ Done'}
                        </button>
                      )}
                      <button onClick={() => handleDelete(a.id)}
                        style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: 'rgba(255,101,132,0.1)', color: 'var(--secondary)', cursor: 'pointer' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <ChatPanel />
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  background: 'var(--surface-3)', border: '1px solid var(--border)',
  color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
};
const primaryBtnStyle: React.CSSProperties = {
  padding: '10px 20px', borderRadius: 10, border: 'none',
  background: 'linear-gradient(135deg, #FFB648, #FB923C)',
  color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer',
};
const cancelBtnStyle: React.CSSProperties = {
  padding: '10px 20px', borderRadius: 10, border: '1px solid var(--border)',
  background: 'transparent', color: 'var(--text-muted)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
};
