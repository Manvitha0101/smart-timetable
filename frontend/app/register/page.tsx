'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, UserPlus } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', institution: '', semester: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        institution: form.institution || undefined,
        semester: form.semester || undefined,
      });
      router.push('/');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (Array.isArray(detail) && detail.length > 0 && detail[0].msg) {
        setError(detail[0].msg.replace('Value error, ', ''));
      } else {
        setError('Registration failed. Check your details.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: 460, padding: 36 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #6C63FF, #A78BFA)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <GraduationCap size={26} color="white" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Create account</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Start managing your academic schedule</p>
        </div>

        <form onSubmit={handleSubmit}>
          <input placeholder="Full name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required style={inputStyle} />
          <input type="email" placeholder="Email *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required style={{ ...inputStyle, marginTop: 12 }} />
          <input type="password" placeholder="Password (8+ chars, upper, lower, digit) *" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required style={{ ...inputStyle, marginTop: 12 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <input placeholder="Institution" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} style={inputStyle} />
            <input placeholder="Semester" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} style={inputStyle} />
          </div>
          {error && <p style={{ color: '#FF6584', fontSize: 12, marginTop: 10 }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ ...btnStyle, marginTop: 20, width: '100%' }}>
            <UserPlus size={16} /> {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 20 }}>
          Already have an account? <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 16px', borderRadius: 10,
  background: 'var(--surface-3)', border: '1px solid var(--border)',
  color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
};
const btnStyle: React.CSSProperties = {
  padding: '12px 20px', borderRadius: 10, border: 'none',
  background: 'linear-gradient(135deg, #6C63FF, #A78BFA)',
  color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
};
