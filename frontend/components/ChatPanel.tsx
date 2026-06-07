'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquareText, Send, X, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { chatApi } from '@/lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  "What's on my schedule today?",
  "Find free time tomorrow",
  "List my pending assignments",
  "Suggest a study plan for this week",
  "Any upcoming exams?",
];

export default function ChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: " Hi! I'm **AcadeBot**, your AI scheduling assistant!\n\nI can help you:\n•  View your schedule\n•  Find free time slots\n•  Create study plans\n•  Detect conflicts\n•  Track assignments\n\nWhat would you like to do?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const botId = (Date.now() + 1).toString();

    const addBotMessage = (content: string) => {
      setMessages((prev) => [...prev, {
        id: botId, role: 'assistant', content, timestamp: new Date(),
      }]);
    };

    try {
      const res = await chatApi.send(text);
      addBotMessage(res.data.reply);
    } catch {
      addBotMessage('️ Could not reach the backend. Make sure the FastAPI server is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = (content: string) => {
    // Simple markdown-like rendering
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.*?)`/g, '<code style="background:var(--surface-3);padding:1px 5px;border-radius:4px;font-size:11px">$1</code>')
      .replace(/•/g, '•')
      .split('\n')
      .map((line, i) => `<span key="${i}">${line}</span>`)
      .join('<br/>');
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
        id="chat-toggle-btn"
        onClick={() => setIsOpen((v) => !v)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 900,
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary), #8B85FF)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(108,99,255,0.4)',
          transition: 'all 0.3s',
        }}
        aria-label="Open AI Chat"
      >
        {isOpen ? <X size={22} color="white" /> : <MessageSquareText size={22} color="white" />}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div
          className="slide-in"
          style={{
            position: 'fixed', bottom: 96, right: 24, zIndex: 901,
            width: 380, height: 560,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 18px',
              background: 'linear-gradient(135deg, var(--primary) 0%, #8B85FF 100%)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}
          >
            <div
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Bot size={20} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>AcadeBot</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <div className="pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: '#43D9AD' }} />
                AI Scheduling Assistant
              </div>
            </div>
            <Sparkles size={16} color="rgba(255,255,255,0.6)" />
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  gap: 8,
                  alignItems: 'flex-end',
                }}
              >
                {msg.role === 'assistant' && (
                  <div style={{
                    width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                    background: 'linear-gradient(135deg, var(--primary), #8B85FF)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Bot size={14} color="white" />
                  </div>
                )}
                <div
                  style={{
                    maxWidth: '78%',
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, var(--primary), #8B85FF)'
                      : 'var(--surface-3)',
                    color: 'var(--text)',
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                  dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }}
                />
                {msg.role === 'user' && (
                  <div style={{
                    width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                    background: 'var(--surface-3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <User size={14} color="var(--text-muted)" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 8,
                  background: 'linear-gradient(135deg, var(--primary), #8B85FF)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Bot size={14} color="white" />
                </div>
                <div style={{ background: 'var(--surface-3)', padding: '10px 14px', borderRadius: '4px 16px 16px 16px' }}>
                  <Loader2 size={16} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompts */}
          {messages.length <= 1 && (
            <div style={{ padding: '8px 14px', display: 'flex', gap: 6, overflowX: 'auto' }}>
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  style={{
                    padding: '5px 10px', borderRadius: 20, whiteSpace: 'nowrap',
                    background: 'var(--surface-3)', border: '1px solid var(--border)',
                    color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', fontWeight: 500,
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{
            padding: '12px 14px', borderTop: '1px solid var(--border)',
            display: 'flex', gap: 8, alignItems: 'flex-end',
          }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
              }}
              placeholder="Ask about your schedule..."
              rows={1}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 12,
                background: 'var(--surface-3)', border: '1px solid var(--border)',
                color: 'var(--text)', fontSize: 13, outline: 'none',
                resize: 'none', fontFamily: 'inherit', lineHeight: 1.4,
                minHeight: 40, maxHeight: 100,
              }}
            />
            <button
              id="chat-send-btn"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              style={{
                width: 40, height: 40, borderRadius: 12, border: 'none',
                background: !input.trim() || loading ? 'var(--surface-3)' : 'linear-gradient(135deg, var(--primary), #8B85FF)',
                color: 'white', cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s', flexShrink: 0,
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
