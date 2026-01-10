

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
  id:string;
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
};

export type User = {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  createdAt: string;
  settings?: UserSettings;
};

// Represents the state of a user's timer, stored in Firestore
export type TimerState = {
  userId: string;
  status: 'running' | 'paused' | 'stopped';
  mode: 'pomodoro' | 'stopwatch';
  subjectId: string;
  // The server timestamp when the timer was last started/resumed
  startedAt: { seconds: number, nanoseconds: number } | null;
  // The server timestamp of the absolute beginning of the session
  sessionStartTime: { seconds: number, nanoseconds: number };
  // Duration in seconds for pomodoro mode
  initialDuration: number;
  // Total time in milliseconds the timer has run before the current 'running' phase
  accumulatedTime: number; 
}

    