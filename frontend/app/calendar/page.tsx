'use client';

import { useEffect, useState, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import CalendarView from '@/components/CalendarView';
import ChatPanel from '@/components/ChatPanel';
import { eventsApi, CalendarEvent } from '@/lib/api';
import { RefreshCw, Plus, Calendar } from 'lucide-react';
import EventModal from '@/components/EventModal';

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await eventsApi.getAll();
      setEvents(res.data);
    } catch {
      setError('Could not load events. Make sure the backend is running on port 8000.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: '28px 32px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Calendar size={24} color="var(--primary)" /> Calendar
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              {events.length} events loaded • Click to edit, drag to reschedule
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={loadEvents}
              style={{
                padding: '9px 14px', borderRadius: 10, border: '1px solid var(--border)',
                background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
              }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <button
              id="new-event-btn"
              onClick={() => setShowModal(true)}
              style={{
                padding: '9px 18px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, var(--primary), #8B85FF)',
                color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: '0 4px 15px rgba(108,99,255,0.35)',
              }}
            >
              <Plus size={16} /> New Event
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            padding: '14px 18px', borderRadius: 12, marginBottom: 20,
            background: 'rgba(255,101,132,0.1)', border: '1px solid rgba(255,101,132,0.3)',
            color: 'var(--secondary)', fontSize: 13,
          }}>
            ️ {error}
          </div>
        )}

        {/* Calendar */}
        <div className="glass-card" style={{ padding: 20 }}>
          {loading ? (
            <div style={{ height: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}></div>
                <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading your schedule...</div>
              </div>
            </div>
          ) : (
            <CalendarView events={events} onEventChange={loadEvents} />
          )}
        </div>

        {showModal && (
          <EventModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            onSave={() => { setShowModal(false); loadEvents(); }}
            onConflict={() => {}}
          />
        )}
      </main>
      <ChatPanel />
    </div>
  );
}
