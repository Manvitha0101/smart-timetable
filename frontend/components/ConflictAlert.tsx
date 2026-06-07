'use client';

import { AlertTriangle, X, Clock, Zap } from 'lucide-react';
import { ConflictInfo } from '@/lib/api';
import { format } from 'date-fns';

interface ConflictAlertProps {
  conflict: ConflictInfo;
  onDismiss: () => void;
  onSelectSlot?: (start: string, end: string) => void;
}

export default function ConflictAlert({ conflict, onDismiss, onSelectSlot }: ConflictAlertProps) {
  const isHard = conflict.severity === 'hard';

  return (
    <div
      className="slide-in"
      style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 2000,
        maxWidth: 380, width: '100%',
      }}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: `1px solid ${isHard ? 'rgba(255,101,132,0.4)' : 'rgba(255,182,72,0.4)'}`,
          borderLeft: `4px solid ${isHard ? '#FF6584' : '#FFB648'}`,
          borderRadius: 14,
          padding: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: isHard ? 'rgba(255,101,132,0.15)' : 'rgba(255,182,72,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <AlertTriangle size={16} color={isHard ? '#FF6584' : '#FFB648'} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                {isHard ? '⚡ Scheduling Conflict' : '⚠️ Tight Schedule'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                {isHard ? 'Events overlap in time' : 'Less than 10 minutes between events'}
              </div>
            </div>
          </div>
          <button
            onClick={onDismiss}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: 4, borderRadius: 6,
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Conflicting events */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Conflicts with:
          </div>
          {conflict.conflicting_events.slice(0, 2).map((ev) => (
            <div
              key={ev.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 10px', borderRadius: 8,
                background: 'var(--surface-3)', marginBottom: 4,
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: ev.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ev.title}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Clock size={9} />
                  {format(new Date(ev.start_time), 'EEE MMM d, h:mm a')}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Suggestions */}
        {conflict.suggestions.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Zap size={10} color="var(--success)" /> Alternative Slots:
            </div>
            {conflict.suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onSelectSlot?.(s.start, s.end)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '7px 10px', borderRadius: 8, marginBottom: 4,
                  background: 'rgba(67,217,173,0.08)',
                  border: '1px solid rgba(67,217,173,0.2)',
                  cursor: 'pointer', transition: 'all 0.15s',
                  fontSize: 12, color: 'var(--success)', fontWeight: 500,
                }}
              >
                ✓ {s.label}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={onDismiss}
          style={{
            marginTop: 12, width: '100%', padding: '8px', borderRadius: 8,
            background: 'var(--surface-3)', border: '1px solid var(--border)',
            color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontWeight: 500,
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
