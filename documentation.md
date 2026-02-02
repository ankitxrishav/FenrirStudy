# FenrirStudy System Documentation v7.0

![Status](https://img.shields.io/badge/System-Operational-emerald?style=for-the-badge) ![Version](https://img.shields.io/badge/Version-7.0.0-blue?style=for-the-badge)

## 1. Executive Summary
**FenrirStudy** is not merely a time-tracking application; it is a **Cognitive Flow Enhancement System** designed for high-performance academic and professional environments. It integrates precise time-management tools with a deep analytical engine to quantify focus, track behavioral patterns, and optimize study rituals. 

Built on a robust **Next.js** and **Firebase** architecture, it delivers a premium, distraction-free user experience characterized by fluid "Ritual" animations (Framer Motion) and a "Glassmorphism" aesthetic that reduces visual fatigue during long sessions.

---

## 2. System Architecture

### 2.1 Technology Stack
The application leverages a modern, type-safe stack designed for performance, scalability, and developer experience.

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Core Framework** | **Next.js 14** (App Router) | Server-side rendering, routing, and React server components. |
| **Language** | **TypeScript** | Strict static typing for robust logic and schema validation. |
| **Styling Engine** | **Tailwind CSS** | Utility-first, responsive design system. |
| **UI Component Lib** | **Shadcn/UI** | Accessible, headless components styled for a premium feel. |
| **Motion Engine** | **Framer Motion** | Physics-based animations for UI transitions and micro-interactions. |
| **Backend & Auth** | **Firebase** | Authentication, NoSQL realtime database (Firestore). |
| **Icons** | **Lucide React** | Consistent, stroke-based iconography. |

### 2.2 Directory Structure
The codebase follows a modular, feature-based architecture:

```text
src/
├── app/                 # Next.js App Router (Routes & Layouts)
│   ├── dashboard/       # Analytical engine & visualization
│   ├── history/         # Session archival & retrieval
│   └── ...
├── components/          # UI Logic
│   ├── app/             # Domain-specific modules (Timer, Stats Cards)
│   └── ui/              # Foundation primitives (Buttons, Cards, Modals)
├── firebase/            # Infrastructure Layer
│   ├── auth/            # Auth hooks & context
│   └── firestore/       # Generic data access layer (DAL)
├── hooks/               # Application Logic / State Machines
│   ├── use-timer.tsx    # Core timer logic engine
│   └── use-dashboard... # Statistical analysis hooks
└── lib/                 # Shared Utilities & Type Definitions
```

---

## 3. Core Modules & Intelligence

### 3.1 The Time Engine (`use-timer`)
The heart of FenrirStudy is a custom-built, dual-mode timer engine.
- **Precision State Management**: Handles complex states (`idle`, `running`, `paused`, `break`) with sub-second accuracy.
- **Persistence Layer**: Automatically syncs active timer state to Firestore, allowing users to **roam between devices** without losing their session context.
- **Modes**:
  - **Pomodoro Protocol**: Structured 25/5 intervals for high-intensity focus.
  - **Flow Mode (Stopwatch)**: Open-ended tracking for deep work sessions.

### 3.2 Intelligence Dashboard (Analytical Engine)
The dashboard provides actionable intelligence rather than just raw data. It processes session history in real-time to generate:
- **Daily Study Pulse**: sophisticated average calculation (`Total Time / Active Days`) for weekly and monthly windows, filtering out inactive days to show true capacity.
- **Temporal Heatmaps**: Visualizes peak productivity hours (0-24h) to identify "Biological Prime Time".
- **Subject Stability**: Tracks consistency % per subject, identifying neglected areas before they become critical.
- **Momentum**: Calculates week-over-week velocity to visualize progress trends.

### 3.3 Subject Rituals
Subjects are treated as "Rituals" rather than simple tags.
- **Visual Identity**: Each subject has a distinct color code and priority level.
- **Lifecycle Management**: Subjects can be archived to keep the active workspace clean while preserving historical data.

---

## 4. Data Dictionary (Schema)

The database is built on **Cloud Firestore** and consists of three primary high-level collections.

### 4.1 Users Collection (`/users/{uid}`)
Contains user identity, global preferences, and calculated streaks.
```typescript
interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  streak: number;           // Current daily streak count
  lastStreakUpdate: string; // ISO Date of the last valid streak increment
  settings: {
    pomodoroDuration: number;   // Minutes (default: 25)
    shortBreakDuration: number; // Minutes (default: 5)
    longBreakDuration: number;  // Minutes (default: 15)
    studyTargetHours: number;   // Daily Goal (1-12 hours)
    sessionEndAlert: boolean;
    breakReminder: boolean;
  }
}
```

### 4.2 Subjects Collection (`/subjects/{id}`)
Represents a study category or project.
```typescript
interface Subject {
  id: string;
  userId: string;
  name: string;
  color: string;            // Hex code (e.g., #FF5733)
  priority: 'low' | 'medium' | 'high';
  archived: boolean;        // Soft-delete flag
  createdAt: string;        // ISO Date
}
```

### 4.3 Sessions Collection (`/sessions/{id}`)
Immutable record of a completed focus block.
```typescript
interface Session {
  id: string;
  userId: string;
  subjectId: string;
  mode: 'pomodoro' | 'stopwatch';
  startTime: string;        // ISO Date
  endTime: string;          // ISO Date
  duration: number;         // Total focused seconds
  focusScore: number;       // Calculated quality score (0-100)
  status: 'completed' | 'stopped';
}
```

---

## 5. Developer Guide

### 5.1 Environment Setup
The project requires a configured Firebase project. Create a `.env.local` file in the root:

```env
NEXT_PUBLIC_FIREBASE_API_KEY="<YOUR_API_KEY>"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="<YOUR_PROJECT_ID>.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="<YOUR_PROJECT_ID>"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="<YOUR_PROJECT_ID>.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="<SENDER_ID>"
NEXT_PUBLIC_FIREBASE_APP_ID="<APP_ID>"
```

### 5.2 Scripts & Commands
- **Development**: `npm run dev` - Starts the hot-reloading dev server on `localhost:3000`.
- **Production Build**: `npm run build` - Compiles the application for deployment (Vercel/Netlify).
- **Type Validation**: `npm run typecheck` - Runs the TypeScript compiler to ensure type safety.

---

## 6. Access & Licensing
- **Live Deployment**: [FenrirStudy on Vercel](https://fenrirstudy.vercel.app/)
- **License**: MIT License. Open source for educational and personal modification.

For any inquiries regarding the "Cognitive Flow" methodology or contributions, please refer to the repository owner.
