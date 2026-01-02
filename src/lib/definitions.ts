
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

export type User = {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  createdAt: string;
};
