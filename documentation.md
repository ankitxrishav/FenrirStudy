# FenrirStudy Documentation

FenrirStudy is a personalized study analytics system designed to enhance focus and productivity through structured timing and data-driven insights. Built with a modern tech stack, it provides students with a powerful toolkit for managing their study habits.

## Architecture Overview

FenrirStudy is a full-stack web application leveraging the following technologies:

- **Framework**: [Next.js](https://nextjs.org/) (App Router) for an optimized React development experience.
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) for utility-first styling and [Shadcn UI](https://ui.shadcn.com/) for accessible, premium components.
- **Backend & Persistence**: [Firebase](https://firebase.google.com/) provides Authentication and Firestore for real-time data storage.
- **Animations**: [Framer Motion](https://www.framer.com/motion/) for smooth, interactive UI transitions.
- **Icons**: [Lucide React](https://lucide.dev/) for a consistent and clean iconography.

---

## Project Structure

```text
src/
├── app/               # Next.js App Router routes and layouts
│   ├── dashboard/     # User analytics and overview
│   ├── history/       # Session logs and records
│   ├── login/         # Authentication views
│   ├── settings/      # User preferences and data export
│   ├── subjects/      # Subject management
│   └── layout.tsx     # Global layout with header and navigation
├── components/        # Reusable UI components
│   ├── app/           # App-specific business components (Timer, Dashboard fragments)
│   └── ui/            # Generic Shadcn UI components
├── firebase/          # Firebase configuration and custom hooks
│   ├── auth/          # Authentication hooks (useUser)
│   ├── firestore/     # Data fetching hooks (useDoc, useCollection)
│   └── config.ts      # Firebase SDK initialization
├── hooks/             # Custom React hooks (useTimer, useToast)
└── lib/               # Utility functions and type definitions
```

---

## Core Features

### 1. Multi-Mode Timer
The study timer supports two primary modes:
- **Pomodoro**: Customizable focus sessions with accompanying break intervals.
- **Stopwatch**: Open-ended tracking for flexible study sessions.
The timer state is persisted across devices, allowing users to resume their focus anywhere.

### 2. Subject Management
Subjects act as categories for study sessions.
- **Customization**: Assign colors and priorities (Low, Medium, High).
- **Organization**: Archive subjects that are no longer active to keep the focus on current goals.

### 3. Analytics Dashboard
A comprehensive view of study progress:
- **Time Studied**: Daily and weekly aggregates.
- **Focus Score**: A percentage-based metric reflecting session completion and quality.
- **Consistency Streak**: Encourages daily study habits by tracking consecutive days with activity.
- **Weekly Overview**: Visual charts showing time distribution across the week.

### 4. Session History
A detailed log of all completed study sessions, filterable by subject and status.

### 5. Personalized Settings
- **Duration Tuning**: Set default Pomodoro and break lengths.
- **Engagement**: Toggle notifications for session end and break reminders.
- **Data Portability**: Export your entire history as **CSV** or **JSON**.

---

## Technical Details

### Data Model (Firestore)

#### **Users** (`/users/{uid}`)
Stores user profile information and global application settings.
```typescript
type User = {
  uid: string;
  displayName: string;
  email: string;
  streak: number;
  settings?: {
    pomodoroDuration: number;
    shortBreakDuration: number;
    longBreakDuration: number;
    sessionEndAlert: boolean;
    breakReminder: boolean;
    studyTargetHours: number;
  };
};
```

#### **Subjects** (`/subjects/{id}`)
Stores study categories created by users.
```typescript
type Subject = {
  id: string;
  userId: string;
  name: string;
  color: string;
  priority: 'low' | 'medium' | 'high';
  archived: boolean;
};
```

#### **Sessions** (`/sessions/{id}`)
Tracks historical study performance.
```typescript
type Session = {
  userId: string;
  subjectId: string;
  mode: 'pomodoro' | 'stopwatch';
  startTime: string;
  endTime: string;
  duration: number; // in seconds
  status: 'completed' | 'stopped';
};
```

### State Management & Hooks
- **[useTimer](file:///Users/ankitkumar/Desktop/FenrirStudy/src/hooks/use-timer.tsx#25-326)**: The central logic for the study timer. Manages tick intervals, state transitions, and Firestore synchronization of the `timerState`.
- **[useUser](file:///Users/ankitkumar/Desktop/FenrirStudy/src/firebase/auth/use-user.ts#12-85)**: Manages the Firebase Auth state and automatically creates/syncs user profile documents.
- **[useDoc](file:///Users/ankitkumar/Desktop/FenrirStudy/src/firebase/firestore/use-doc.ts#13-51) & `useCollection`**: Generic, typed wrappers for real-time Firestore synchronization using `onSnapshot`.

---

## Setup & Development

### Prerequisites
- Node.js (Latest LTS)
- A Firebase Project (with Auth and Firestore enabled)

### Installation
1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure environment variables in [.env.local](file:///Users/ankitkumar/Desktop/FenrirStudy/.env.local):
    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY="..."
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..."
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
    NEXT_PUBLIC_FIREBASE_APP_ID="..."
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="..."
    ```

### Available Scripts
- `npm run dev`: Starts the development server.
- `npm run build`: Builds the production application.
- `npm run lint`: Runs ESLint for code quality checks.
- `npm run typecheck`: Performs static type checking with TypeScript.
