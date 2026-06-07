'use client';

import Sidebar from '@/components/Sidebar';
import ChatPanel from '@/components/ChatPanel';
import { MessageSquareText, Bot, Sparkles, Zap, BookOpen, Calendar, Clock, Search } from 'lucide-react';

const FEATURES = [
  { icon: Calendar, color: '#6C63FF', title: 'Schedule Events', desc: '"Schedule Physics lab on Thursday 2pm for 2 hours"' },
  { icon: Search, color: '#43D9AD', title: 'Find Free Time', desc: '"Find me 2 free hours tomorrow afternoon"' },
  { icon: Zap, color: '#FF6584', title: 'Conflict Detection', desc: '"Check if I have anything on Friday 10am"' },
  { icon: BookOpen, color: '#FFB648', title: 'Study Plans', desc: '"Plan my studies for the DBMS exam next week"' },
  { icon: Clock, color: '#A78BFA', title: 'Assignment Help', desc: '"What assignments are due this week?"' },
  { icon: Sparkles, color: '#38BDF8', title: 'Schedule Summary', desc: '"Give me a summary of today\'s schedule"' },
];

export default function ChatPage() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: '28px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', maxWidth: 600, marginBottom: 48 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 24, margin: '0 auto 24px',
            background: 'linear-gradient(135deg, var(--primary), #FF6584)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 20px 60px rgba(108,99,255,0.4)',
          }}>
            <Bot size={40} color="white" />
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>
            <span className="gradient-text">AcadeBot</span>
          </h1>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>
            Your AI Scheduling Assistant
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 24 }}>
            Chat naturally to manage your academic schedule. AcadeBot understands your schedule,
            finds free time, detects conflicts, and creates smart study plans — all through conversation.
          </p>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px',
            borderRadius: 20, background: 'rgba(67,217,173,0.1)', border: '1px solid rgba(67,217,173,0.25)',
          }}>
            <div className="pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: '#43D9AD' }} />
            <span style={{ fontSize: 13, color: '#43D9AD', fontWeight: 600 }}>
              AI Chat is active — click the button in the bottom right!
            </span>
          </div>
        </div>

        {/* Feature Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 800, width: '100%', marginBottom: 40 }}>
          {FEATURES.map(({ icon: Icon, color, title, desc }) => (
            <div
              key={title}
              className="glass-card"
              style={{ padding: '18px 20px', transition: 'transform 0.2s', cursor: 'default' }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-3px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10, marginBottom: 12,
                background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={18} color={color} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, fontStyle: 'italic' }}>{desc}</div>
            </div>
          ))}
        </div>
      </main>
      <ChatPanel />
    </div>
  );
}
