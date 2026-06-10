

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

// ==========================================
// STUDY ROOMS
// ==========================================

export type RoomMemberRole = 'owner' | 'member';

export type RoomMemberStatus = 'studying' | 'break' | 'idle' | 'offline';

export type Room = {
  id: string;
  name: string;
  description?: string;
  code: string;           // 6-character uppercase invite code, e.g. "FEN123"
  password?: string;      // optional, plain string (hashed server-side if needed)
  ownerId: string;
  memberIds: string[];    // array of user UIDs
  createdAt: string;      // ISO string
  totalMemberCount: number;
  collectiveStreak: number;
  lastCollectiveStreakUpdate: string;  // 'yyyy-MM-dd'
  sharedFocus?: {
    status: 'running' | 'paused' | 'stopped';
    mode: 'work' | 'break';
    startedAt: string;      // ISO when current phase started
    workDuration: number;   // minutes, default 25
    breakDuration: number;  // minutes, default 5
    cycleCount: number;     // how many work cycles completed
    startedBy: string;      // userId of who started it
  };
};

export type RoomMember = {
  id: string;             // document id = userId
  roomId: string;
  userId: string;
  role: RoomMemberRole;
  joinedAt: string;       // ISO string
  status: RoomMemberStatus;
  currentSubjectId?: string;
  lastSeen: string;       // ISO string — updated every 30s when online
  displayName: string;
  photoURL: string;

  // Live timer state (mirrored from timerStates/{userId} by the client via use-room-presence)
  timerStatus?: 'running' | 'paused' | 'stopped';
  timerMode?: 'pomodoro' | 'stopwatch';
  subjectId?: string | null;
  subjectName?: string | null;   // denormalized so readers don't need extra query
  subjectColor?: string | null;  // hex color, denormalized same reason
  startedAt?: string | null;     // ISO string — when current phase started
  accumulatedTime?: number;      // seconds elapsed before current phase
  initialDuration?: number;      // seconds, for pomodoro mode
  finishedAt?: string | null;    // ISO string — set for ~4s when timer just completed
};

export type RoomMessage = {
  id: string;
  roomId: string;
  userId: string;
  displayName: string;
  photoURL: string;
  text: string;
  createdAt: string;      // ISO string
  type: 'message' | 'system';  // system = "X joined the room"
};

export type RoomChallenge = {
  id: string;
  roomId: string;
  createdBy: string;      // userId
  title: string;          // e.g. "Study 50 hours this month"
  description?: string;
  targetHours: number;
  startDate: string;      // ISO string
  endDate: string;        // ISO string
  participantIds: string[];
  status: 'active' | 'completed' | 'expired';
};

export type RoomChallengeProgress = {
  id: string;             // document id = challengeId_userId
  challengeId: string;
  roomId: string;
  userId: string;
  hoursLogged: number;
  completedAt?: string;   // ISO string, set when hoursLogged >= targetHours
};

export type SessionReaction = {
  id: string;
  sessionId: string;
  roomId: string;
  fromUserId: string;
  fromDisplayName: string;
  emoji: string;          // one of: "🔥" | "✅" | "📚" | "💪" | "⚡"
  createdAt: string;      // ISO string
};

export type RoomGoal = {
  id: string;
  roomId: string;
  userId: string;
  displayName: string;
  text: string;           // e.g. "Finish Calculus chapter 5 today"
  targetDate: string;     // 'yyyy-MM-dd'
  completed: boolean;
  createdAt: string;      // ISO string
};

export type AccountabilityPair = {
  id: string;
  roomId: string;
  userIds: [string, string];  // exactly two userIds
  checkInTime: string;        // 'HH:mm' — reminder time
  createdAt: string;          // ISO string
  active: boolean;
};

