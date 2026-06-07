'use client';

import { useState } from 'react';
import { X, Calendar, Clock, MapPin, BookOpen, Tag, AlertTriangle } from 'lucide-react';
import { eventsApi, remindersApi, CalendarEvent, ConflictInfo } from '@/lib/api';
import { format } from 'date-fns';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStart?: string;
  defaultEnd?: string;
  editingEvent?: CalendarEvent | null;
  onSave: () => void;
  onConflict: (conflict: ConflictInfo) => void;
}

const EVENT_TYPES = [
  { value: 'class', label: ' Class', color: '#6C63FF' },
  { value: 'exam', label: ' Exam', color: '#FF6584' },
  { value: 'study', label: ' Study', color: '#43D9AD' },
  { value: 'assignment', label: ' Assignment', color: '#FFB648' },
  { value: 'personal', label: ' Personal', color: '#A78BFA' },
] as const;

const formatForInput = (isoStr?: string) => {
  if (!isoStr) return '';
  return isoStr.length > 16 ? isoStr.slice(0, 16) : isoStr;
};

export default function EventModal({
  isOpen, onClose, defaultStart, defaultEnd, editingEvent, onSave, onConflict,
}: EventModalProps) {
  const [form, setForm] = useState<{
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    event_type: 'class' | 'exam' | 'study' | 'assignment' | 'personal';
    subject: string;
    location: string;
  }>({
    title: editingEvent?.title || '',
    description: editingEvent?.description || '',
    start_time: formatForInput(editingEvent?.start_time || defaultStart),
    end_time: formatForInput(editingEvent?.end_time || defaultEnd),
    event_type: editingEvent?.event_type || 'class',
    subject: editingEvent?.subject || '',
    location: editingEvent?.location || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scheduleReminders, setScheduleReminders] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.start_time || !form.end_time) {
      setError('Title, start time, and end time are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        ...form,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
      };

      let result;
      if (editingEvent) {
        result = await eventsApi.update(editingEvent.id, payload);
      } else {
        result = await eventsApi.create(payload);
      }

      if (result.data.conflict.has_conflict) {
        onConflict(result.data.conflict);
      }
      if (!editingEvent && scheduleReminders) {
        try {
          await remindersApi.autoSchedule(result.data.event.id);
        } catch {}
      }
      onSave();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save event. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingEvent || !confirm('Delete this event?')) return;
    setLoading(true);
    try {
      await eventsApi.delete(editingEvent.id);
      onSave();
    } catch {
      setError('Failed to delete event.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedType = EVENT_TYPES.find((t) => t.value === form.event_type);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="glass-card fade-in"
        style={{ width: '100%', maxWidth: 500, padding: 28, maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
              {editingEvent ? 'Edit Event' : 'New Event'}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Conflicts are auto-detected
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--surface-3)', border: 'none', borderRadius: 8,
              width: 32, height: 32, cursor: 'pointer', color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <Field label="Event Title" icon={<Calendar size={14} />}>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Data Structures Lecture"
              style={inputStyle}
            />
          </Field>

          {/* Type */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Event Type</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {EVENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm({ ...form, event_type: t.value })}
                  style={{
                    padding: '6px 12px', borderRadius: 20, fontSize: 12,
                    fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                    border: form.event_type === t.value ? `2px solid ${t.color}` : '2px solid var(--border)',
                    background: form.event_type === t.value ? `${t.color}22` : 'var(--surface-3)',
                    color: form.event_type === t.value ? t.color : 'var(--text-muted)',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date/Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Start Time</label>
              <input
                type="datetime-local"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                style={{ ...inputStyle, colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label style={labelStyle}>End Time</label>
              <input
                type="datetime-local"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                style={{ ...inputStyle, colorScheme: 'dark' }}
              />
            </div>
          </div>

          {/* Subject */}
          <Field label="Subject (optional)" icon={<BookOpen size={14} />}>
            <input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="e.g. Data Structures"
              style={inputStyle}
            />
          </Field>

          {/* Location */}
          <Field label="Location (optional)" icon={<MapPin size={14} />}>
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. CS Block A-101"
              style={inputStyle}
            />
          </Field>

          {/* Description */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Notes (optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Additional notes..."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          {!editingEvent && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer' }}>
              <input type="checkbox" checked={scheduleReminders} onChange={(e) => setScheduleReminders(e.target.checked)} />
              Schedule email reminders (1 day, 2 hours, 30 min before)
            </label>
          )}

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,101,132,0.1)', border: '1px solid rgba(255,101,132,0.3)',
              borderRadius: 8, padding: '10px 12px', marginBottom: 16,
            }}>
              <AlertTriangle size={14} color="var(--secondary)" />
              <span style={{ fontSize: 13, color: 'var(--secondary)' }}>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            {editingEvent && (
              <button type="button" onClick={handleDelete} disabled={loading} style={dangerBtnStyle}>
                Delete
              </button>
            )}
            <button type="button" onClick={onClose} disabled={loading} style={cancelBtnStyle}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{
              ...primaryBtnStyle,
              background: selectedType?.color || 'var(--primary)',
              boxShadow: `0 4px 15px ${selectedType?.color || 'var(--primary)'}44`,
            }}>
              {loading ? 'Saving...' : (editingEvent ? 'Update Event' : 'Create Event')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: 'var(--primary)' }}>{icon}</span> {label}
      </label>
      {children}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  background: 'var(--surface-3)', border: '1px solid var(--border)',
  color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
};

const primaryBtnStyle: React.CSSProperties = {
  padding: '10px 20px', borderRadius: 10, border: 'none',
  color: 'white', fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s',
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '10px 20px', borderRadius: 10, border: '1px solid var(--border)',
  background: 'transparent', color: 'var(--text-muted)', fontWeight: 600, fontSize: 14,
  cursor: 'pointer',
};

const dangerBtnStyle: React.CSSProperties = {
  padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(255,101,132,0.3)',
  background: 'rgba(255,101,132,0.1)', color: 'var(--secondary)', fontWeight: 600,
  fontSize: 14, cursor: 'pointer',
};
