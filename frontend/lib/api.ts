import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  institution?: string;
  semester?: string;
  avatar_color: string;
  is_demo: boolean;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  event_type: 'class' | 'exam' | 'study' | 'assignment' | 'personal';
  subject?: string;
  location?: string;
  color: string;
  is_recurring: boolean;
  recurrence_rule?: string;
  google_event_id?: string;
  created_at: string;
}

export interface ConflictInfo {
  has_conflict: boolean;
  conflicting_events: CalendarEvent[];
  severity: 'none' | 'soft' | 'hard';
  suggestions: { start: string; end: string; label: string }[];
}

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  description?: string;
  due_date: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  estimated_hours: number;
  created_at: string;
}

export interface WeeklyStats {
  total_scheduled_hours: number;
  study_hours: number;
  class_hours: number;
  free_hours: number;
  productivity_score: number;
  subject_breakdown: { subject: string; hours: number; color: string }[];
  busiest_day: string;
  upcoming_deadlines: number;
}

export interface Overview {
  today_events: number;
  upcoming_exams: number;
  pending_assignments: number;
  study_hours_this_week: number;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; password: string; name: string; institution?: string; semester?: string }) =>
    api.post<{ access_token: string; user: UserProfile }>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<{ access_token: string; user: UserProfile }>('/auth/login', data),

  logout: () => api.post('/auth/logout'),

  getMe: () => api.get<UserProfile>('/auth/me'),

  updateMe: (data: Partial<{ name: string; institution: string; semester: string }>) =>
    api.put<UserProfile>('/auth/me', data),
};

// ─── Events API ───────────────────────────────────────────────────────────────
export const eventsApi = {
  getAll: (params?: { start?: string; end?: string; event_type?: string }) =>
    api.get<CalendarEvent[]>('/api/events', { params }),

  create: (data: Partial<CalendarEvent>) =>
    api.post<{ event: CalendarEvent; conflict: ConflictInfo }>('/api/events', data),

  update: (id: string, data: Partial<CalendarEvent>) =>
    api.put<{ event: CalendarEvent; conflict: ConflictInfo }>(`/api/events/${id}`, data),

  delete: (id: string) => api.delete(`/api/events/${id}`),

  checkConflicts: (data: Partial<CalendarEvent>) =>
    api.post<ConflictInfo>('/api/events/check-conflicts', data),

  getFreeSlots: (params: { date_from: string; date_to: string; duration_minutes: number }) =>
    api.post<{ start: string; end: string; duration_minutes: number }[]>('/api/events/free-slots', params),
};

// ─── Assignments API ──────────────────────────────────────────────────────────
export const assignmentsApi = {
  getAll: (params?: { status?: string; subject?: string }) =>
    api.get<Assignment[]>('/api/assignments', { params }),

  create: (data: Partial<Assignment>) => api.post<Assignment>('/api/assignments', data),

  update: (id: string, data: Partial<Assignment>) =>
    api.put<Assignment>(`/api/assignments/${id}`, data),

  delete: (id: string) => api.delete(`/api/assignments/${id}`),

  getStudyPlan: (days: number = 7) =>
    api.post<{ sessions: any[]; total: number }>(`/api/assignments/study-plan?days_ahead=${days}`),

  applyStudyPlan: (days: number = 7) =>
    api.post<{ created: number; sessions: any[] }>(`/api/assignments/study-plan/apply?days_ahead=${days}`),
};

// ─── Analytics API ────────────────────────────────────────────────────────────
export const analyticsApi = {
  getWeekly: () => api.get<WeeklyStats>('/api/analytics/weekly'),
  getOverview: () => api.get<Overview>('/api/analytics/overview'),
  getSubjectHours: (days?: number) =>
    api.get<{ subject: string; hours: number; color: string }[]>('/api/analytics/subject-hours', {
      params: { days },
    }),
  getDailyHours: (days?: number) =>
    api.get<any[]>('/api/analytics/daily-hours', { params: { days } }),
  getUpcomingDeadlines: (days?: number) =>
    api.get<any[]>('/api/analytics/upcoming-deadlines', { params: { days } }),
};

// ─── Chat API ─────────────────────────────────────────────────────────────────
export const chatApi = {
  send: (message: string) =>
    api.post<{ reply: string; actions_taken: any[]; events_created: any[] }>('/api/chat', {
      message,
    }),

  getWsUrl: (token?: string | null) => {
    const base = API_URL.replace(/^http/, 'ws');
    return token ? `${base}/api/chat/ws?token=${token}` : `${base}/api/chat/ws`;
  },
};

// ─── Google Calendar API ──────────────────────────────────────────────────────
export const googleApi = {
  getStatus: () => api.get<{ configured: boolean; connected: boolean; calendar_id: string }>('/api/google/status'),
  getAuthUrl: () => api.get<{ auth_url: string }>('/api/google/auth-url'),
  sync: () => api.post<{ imported: number; message: string }>('/api/google/sync'),
  disconnect: () => api.post('/api/google/disconnect'),
};

// ─── Reminders API ────────────────────────────────────────────────────────────
export const remindersApi = {
  getStatus: () => api.get<{ email_configured: boolean }>('/api/reminders/status'),
  autoSchedule: (eventId: string) => api.post(`/api/reminders/auto/${eventId}`),
};

export default api;
