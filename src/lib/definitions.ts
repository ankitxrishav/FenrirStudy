

export type Subject = {
  id: string;
  userId: string;
  name: string;
  color: string;
  priority?: 'low' | 'medium' | 'high';
  archived: boolean;
  createdAt: string; // ISO string
};

export type Session = {
  id: string;
  userId: string;
  subjectId: string;
  mode: 'pomodoro' | 'stopwatch';
  startTime: string; // ISO string
  endTime: string; // ISO string
  duration: number; // in seconds
  pauseCount: number;
  status: 'completed' | 'stopped';
  focusScore: number;
};

export type Goal = {
  id: string;
  userId: string;
  type: 'daily' | 'weekly-subject';
  targetMinutes: number;
  subjectId?: string;
};


export type UserSettings = {
  pomodoroDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionEndAlert: boolean;
  breakReminder: boolean;
  studyTargetHours: number; // New: Daily study goal (1-12)
  dashboardDensity?: 'compact' | 'relaxed';
  minimalMode?: boolean;
};

export type User = {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  createdAt: string;
  settings?: UserSettings;
  streak: number; // Current study target streak
  lastStreakUpdate?: string; // Last date the streak was maintained
  lastLogin?: string;
};

// Represents the state of a user's timer, stored in Firestore
export type TimerState = {
  userId: string;
  status: 'running' | 'paused' | 'stopped';
  mode: 'pomodoro' | 'stopwatch';
  subjectId: string;
  // The server timestamp when the timer was last started/resumed
  startedAt: any;
  // The server timestamp of the absolute beginning of the session
  sessionStartTime: any;
  // Duration in seconds for pomodoro mode
  initialDuration: number;
  // Total time in milliseconds the timer has run before the current 'running' phase
  accumulatedTime: number;
}

// ==========================================
// HABIT ROUTINE TRACKER
// ==========================================

export type HabitCategory = 'exercise' | 'health' | 'learning' | 'work' | 'mindfulness' | 'custom';

export const HABIT_CATEGORY_META: Record<HabitCategory, { label: string; icon: string; color: string }> = {
  exercise: { label: 'Exercise', icon: '💪', color: '#10b981' },
  health: { label: 'Health', icon: '🥗', color: '#f59e0b' },
  learning: { label: 'Learning', icon: '🧠', color: '#3b82f6' },
  work: { label: 'Work', icon: '💼', color: '#64748b' },
  mindfulness: { label: 'Mindfulness', icon: '🧘', color: '#ec4899' },
  custom: { label: 'Custom', icon: '⭐', color: '#f97316' },
};

export type Habit = {
  id: string;
  userId: string;
  name: string;
  category: HabitCategory;
  frequencyType: 'daily' | 'weekly';
  weekDays: number[];   // 0=Sun … 6=Sat, used when frequencyType='weekly'
  reminderTime: string | null; // 'HH:mm' or null
  startTime?: string | null;    // 'HH:mm' or null
  endTime?: string | null;      // 'HH:mm' or null
  order: number;
  createdAt: string; // ISO string
};

export type HabitLog = {
  id: string;
  habitId: string;
  userId: string;
  date: string;      // 'yyyy-MM-dd'
  status: 'completed' | 'pending';
  timestamp: string; // ISO string — when the log was last updated
};

