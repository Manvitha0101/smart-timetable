'use client';

import { useState, useCallback, useEffect } from 'react';
import { CalendarEvent, eventsApi } from '@/lib/api';
import EventModal from './EventModal';
import ConflictAlert from './ConflictAlert';

interface CalendarViewProps {
  events: CalendarEvent[];
  onEventChange: () => void;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  class: 'Class', exam: 'Exam', study: 'Study', assignment: 'Assignment', personal: 'Personal',
};

// Dynamically loaded FullCalendar component — avoids Turbopack class constructor issue
let CalendarComponent: any = null;

function loadCalendar(): Promise<any> {
  if (CalendarComponent) return Promise.resolve(CalendarComponent);
  return Promise.all([
    import('@fullcalendar/react'),
    import('@fullcalendar/daygrid'),
    import('@fullcalendar/timegrid'),
    import('@fullcalendar/interaction'),
    import('@fullcalendar/list'),
  ]).then(([FC, dayGrid, timeGrid, interaction, list]) => {
    CalendarComponent = {
      FullCalendar: FC.default,
      plugins: [dayGrid.default, timeGrid.default, interaction.default, list.default],
    };
    return CalendarComponent;
  });
}

export default function CalendarView({ events, onEventChange }: CalendarViewProps) {
  const [calLib, setCalLib] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<{ start: string; end: string } | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [conflictInfo, setConflictInfo] = useState<any>(null);
  const [tooltip, setTooltip] = useState<{ event: CalendarEvent; x: number; y: number } | null>(null);

  useEffect(() => {
    loadCalendar().then(setCalLib).catch(console.error);
  }, []);

  const fcEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    start: e.start_time,
    end: e.end_time,
    backgroundColor: e.color,
    borderColor: e.color,
    extendedProps: { ...e },
  }));

  const handleDateSelect = useCallback((selectInfo: any) => {
    setEditingEvent(null);
    setSelectedDate({ start: selectInfo.startStr, end: selectInfo.endStr });
    setShowModal(true);
  }, []);

  const handleEventClick = useCallback((clickInfo: any) => {
    const ev = clickInfo.event.extendedProps as CalendarEvent;
    setEditingEvent({ ...ev, id: clickInfo.event.id, title: clickInfo.event.title });
    setSelectedDate(null);
    setShowModal(true);
  }, []);

  const handleEventDrop = useCallback(async (dropInfo: any) => {
    const ev = dropInfo.event;
    try {
      const result = await eventsApi.update(ev.id, {
        start_time: ev.startStr,
        end_time: ev.endStr,
      });
      if (result.data.conflict.has_conflict) {
        setConflictInfo(result.data.conflict);
      }
      onEventChange();
    } catch {
      dropInfo.revert();
    }
  }, [onEventChange]);

  const handleEventMouseEnter = useCallback((info: any) => {
    setTooltip({ event: info.event.extendedProps as CalendarEvent, x: info.jsEvent.clientX, y: info.jsEvent.clientY });
  }, []);

  const handleEventMouseLeave = useCallback(() => setTooltip(null), []);

  if (!calLib) {
    return (
      <div style={{ height: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading calendar...</div>
        </div>
      </div>
    );
  }

  const { FullCalendar, plugins } = calLib;

  return (
    <div style={{ position: 'relative' }}>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        {[
          { label: 'Class', color: '#6C63FF' },
          { label: 'Exam', color: '#FF6584' },
          { label: 'Study', color: '#43D9AD' },
          { label: 'Assignment', color: '#FFB648' },
          { label: 'Personal', color: '#A78BFA' },
        ].map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
          </div>
        ))}
      </div>

      <FullCalendar
        plugins={plugins}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
        }}
        events={fcEvents}
        selectable={true}
        selectMirror={true}
        editable={true}
        droppable={true}
        dayMaxEvents={3}
        weekends={true}
        slotMinTime="06:00:00"
        slotMaxTime="23:00:00"
        allDaySlot={false}
        height="calc(100vh - 200px)"
        nowIndicator={true}
        select={handleDateSelect}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        eventMouseEnter={handleEventMouseEnter}
        eventMouseLeave={handleEventMouseLeave}
        slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: true }}
        eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: true }}
      />

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed', left: tooltip.x + 12, top: tooltip.y - 10, zIndex: 9999,
          background: 'var(--surface-3)', border: '1px solid var(--border)',
          borderLeft: `3px solid ${tooltip.event.color}`, borderRadius: 10,
          padding: '10px 14px', maxWidth: 240, pointerEvents: 'none',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
            {tooltip.event.title}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {EVENT_TYPE_LABELS[tooltip.event.event_type]}
          </div>
          {tooltip.event.subject && (
            <div style={{ fontSize: 11, color: 'var(--primary)', marginTop: 2 }}>
              {tooltip.event.subject}
            </div>
          )}
          {tooltip.event.location && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {tooltip.event.location}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <EventModal
          isOpen={showModal}
          onClose={() => { setShowModal(false); setEditingEvent(null); setSelectedDate(null); }}
          defaultStart={selectedDate?.start}
          defaultEnd={selectedDate?.end}
          editingEvent={editingEvent}
          onSave={async () => { setShowModal(false); onEventChange(); }}
          onConflict={(c) => setConflictInfo(c)}
        />
      )}

      {conflictInfo && conflictInfo.has_conflict && (
        <ConflictAlert conflict={conflictInfo} onDismiss={() => setConflictInfo(null)} />
      )}
    </div>
  );
}
