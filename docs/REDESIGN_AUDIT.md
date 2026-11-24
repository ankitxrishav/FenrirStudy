# FenrirStudy — Redesign Phase 0 Audit

Baseline repository audit performed prior to implementing `FENRIRSTUDY_REDESIGN_BRIEF.md`. All paths, symbol names, state flows, and style occurrences below were verified directly against the codebase at commit `b76d343`.

---

## 1. Tooling & Build Baseline

| Check | Command | Baseline Result | Notes |
|---|---|---|---|
| Typecheck | `npm run typecheck` (`tsc --noEmit`) | Pass (exit 0) | Clean TypeScript compilation across current codebase. |
| Lint | `npm run lint` (`next lint`) | Blocked (interactive prompt) | No `.eslintrc.*` or `eslint.config.*` exists, and `eslint` / `eslint-config-next` are not in `package.json` `devDependencies`. |
| Production Build | `npx next build` | Pass (16/16 pages) | `next.config.ts` sets `typescript.ignoreBuildErrors: true` and `eslint.ignoreDuringBuilds: true`. `@ducanh2912/next-pwa` writes `public/sw.js` during `next build`. `/api/notify` logs a non-fatal Firebase Admin init error at build time when `FIREBASE_SERVICE_ACCOUNT` / local service account JSON is absent. |

---

## 2. Route & Page Inventory

| Route | Source File | Purpose & Key Child Components | Auth Guard / Routing Behavior |
|---|---|---|---|
| `/` | `src/app/page.tsx` | Smart room redirect or standalone Timer view (`Timer`, `PihuCat`, `LoadingScreen`). | Queries `collectionGroup('members')` for `user.uid`. If `memberDocs.length > 0`, `router.replace('/rooms/' + roomId)`. Unauthenticated visitors see `<Timer />` ("Login to select subject") — no redirect to `/login`. |
| `/login` | `src/app/login/page.tsx` | Google OAuth sign-in (`signInWithPopup`), `PihuCat`. | On success, executes `router.push('/dashboard')`. No redirect if already authenticated. |
| `/rooms` | `src/app/rooms/page.tsx` | Room list, invite code share/copy, `CreateRoomDialog`, `JoinRoomDialog`. | Client `useEffect` pushes `/login` when `!user`. Auto-redirects via `router.replace('/rooms/' + rooms[0].id)` when `rooms.length === 1`. |
| `/rooms/[roomId]` | `src/app/rooms/[roomId]/page.tsx` | Room workspace: `RoomStreakBanner`, `MemberTimerGrid`, 5 panels (`MemberGrid`, `RoomLeaderboard`, `RoomChallenges`, `RoomAnalytics`, `RoomGoalBoard`), sidebar (`RoomPersonalTimer` / `SharedFocusPanel`), collapsible `StandaloneChat`, `RoomMemberStats`, `RoomFinishFx`, `MemberProfileDrawer`, `RoomSettingsDialog`, `PihuCat`. | Client `useEffect` pushes `/login` when `!user`. Attaches `usePresenceSync`, `useRoomPresence`, `useFinishBroadcast`. |
| `/dashboard` | `src/app/dashboard/page.tsx` | Overview tab (`Overview` bar chart, `RecentSessions`, 6 stat cards, subject distribution, 24h bar heatmap, active rooms) and Habits tab (`HabitAnalytics`), plus `PihuCat`. | Client `useEffect` pushes `/login` when `!user`. Tab choice saved in `localStorage('dashboard-tab')`. |
| `/goals` | `src/app/goals/page.tsx` | Daily study goal slider (`1–12h`, `settings.studyTargetHours`) and Day Streak display (`users/{uid}.streak`). | **Gap:** Renders `LoadingScreen` when `!user` with no redirect to `/login`. |
| `/routine` | `src/app/routine/page.tsx` | Daily habit tracker: `StarterGuide`, `DateSelector`, `ProgressHeader`, `HabitItem` list, `AddEditHabitDialog`. | Client `useEffect` pushes `/login` when `!user`. |
| `/subjects` | `src/app/subjects/page.tsx` | Active & archived subjects grid (`subjects`), per-subject time/sessions summary, `AddSubjectDialog`, `EditSubjectDialog`, cascade session deletion. | Client `useEffect` pushes `/login` when `!user`. |
| `/history` | `src/app/history/page.tsx` | 30-day heatmap, "Today's Focus" session list, collapsible date-grouped "Temporal Records". | Client `useEffect` pushes `/login` when `!user`. |
| `/settings` | `src/app/settings/page.tsx` | Pomodoro/Break durations, Audio Signals toggle, Dashboard Density select (`compact` \| `relaxed`), CSV/JSON export. | Client `useEffect` pushes `/login` when `!user`. |
| `/api/upload` | `src/app/api/upload/route.ts` | Uploads room chat images to Cloudinary (`rooms` folder, `temporary_24h` tag). | Server API route (`CLOUDINARY_URL`). |
| `/api/delete` | `src/app/api/delete/route.ts` | Destroys Cloudinary image by `publicId` (24h auto-cleanup & manual delete). | Server API route (`CLOUDINARY_URL`). |
| `/api/notify` | `src/app/api/notify/route.ts` | Sends FCM multicast push notifications to room members and cleans stale tokens. | Server API route (`FIREBASE_SERVICE_ACCOUNT` or local JSON). |

---

## 3. Shared Layout, Providers & Component Inventory

### 3.1 Root Shell (`src/app/layout.tsx`)
- Loads `Inter` (`--font-inter`), sets `viewport.themeColor = '#09090b'` and `public/manifest.json` (`start_url: "/"`, `background_color: "#09090b"`, `theme_color: "#09090b"`).
- Provider nesting: `ThemeProvider` (`next-themes`, `attribute="class"`, `defaultTheme="system"`) → `FirebaseClientProvider` → `TimerProvider` → fixed `AppHeader` (`h-16`) + scrollable `<main className="flex-1 overflow-y-auto pt-16 pb-24">` + fixed `footer` containing `BottomNav` + `Toaster` + `FcmInitializer`.

### 3.2 Shared App Components (`src/components/app/`)
- `header.tsx` (`AppHeader`): Logo (`/icon/logo.svg`), `ThemeToggle`, `StyleSelector` drawer trigger (`Settings2`), Level badge (`calculateUserLevel`), Streak pill (`Flame`), `UserNav`. Also runs a streak-expiration `useEffect` writing `{ streak: 0 }` to `users/{uid}`.
- `bottom-nav.tsx` (`BottomNav`): Floating glassmorphic pill (`rounded-full`, `backdrop-blur-xl`), hidden on `/login`, displaying 8 links (`Timer` `/`, `Dashboard` `/dashboard`, `Goals` `/goals`, `Rooms` `/rooms` or `/rooms/${rooms[0].id}`, `Routine` `/routine`, `Subjects` `/subjects`, `History` `/history`, `Settings` `/settings`).
- `user-nav.tsx` (`UserNav`): Avatar menu linking to `/dashboard`, `/settings`, and `signOut(auth)`.
- `loading-screen.tsx` (`LoadingScreen`): `Loader2` spinner + uppercase `Loading` label.
- `theme-toggle.tsx` (`ThemeToggle`): Light/dark toggle via `useTheme()`.
- `fcm-initializer.tsx` (`FcmInitializer`): Mounts `useFcm()` globally.

### 3.3 Feature Component Groups
- **Timer (`src/components/app/timer/`):** `timer.tsx`, `timer-display.tsx`, `timer-controls.tsx`, `style-selector.tsx`, `add-subject-dialog.tsx`, `edit-subject-dialog.tsx`, and 5 faces in `faces/` (`digital-face.tsx`, `ring-face.tsx`, `analog-face.tsx`, `radial-face.tsx`, `retro-face.tsx`).
- **Rooms (`src/components/app/rooms/`):** `create-room-dialog.tsx`, `join-room-dialog.tsx`, `member-timer-grid.tsx`, `member-timer-card.tsx`, `member-grid.tsx`, `member-profile-drawer.tsx`, `room-personal-timer.tsx`, `shared-focus-panel.tsx`, `room-streak-banner.tsx`, `room-leaderboard.tsx`, `room-challenges.tsx`, `room-analytics.tsx`, `room-goal-board.tsx`, `room-member-stats.tsx`, `room-session-feed.tsx`, `session-reaction-bar.tsx`, `accountability-pairs.tsx`, `room-settings-dialog.tsx`, `room-theme-picker.tsx`, `room-finish-fx.tsx`, `room-error-boundary.tsx`, `standalone-chat.tsx`, `room-chat.tsx` (legacy/unused — `StandaloneChat` is rendered in `rooms/[roomId]/page.tsx`), `pihu-cat.tsx`.
- **Dashboard (`src/components/app/dashboard/`):** `overview.tsx`, `recent-sessions.tsx`, `habit-analytics.tsx`.
- **Habits (`src/components/app/habits/`):** `date-selector.tsx`, `progress-header.tsx`, `habit-item.tsx`, `add-edit-habit-dialog.tsx`, `starter-guide.tsx`.
- **Icons (`src/components/icons/index.tsx`):** `FenrirLogo` custom SVG (imported in `header.tsx` though `header.tsx` renders `<Image src="/icon/logo.svg" />`).
- **UI Primitives (`src/components/ui/`):** 36 shadcn/ui Radix/Tailwind components (`accordion`, `alert-dialog`, `alert`, `avatar`, `badge`, `button`, `calendar`, `card`, `carousel`, `chart`, `checkbox`, `collapsible`, `dialog`, `dropdown-menu`, `form`, `input`, `label`, `menubar`, `popover`, `progress`, `radio-group`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `slider`, `switch`, `table`, `tabs`, `textarea`, `toast`, `toaster`, `toggle-group`, `toggle`, `tooltip`).

---

## 4. Auth Listener, Firebase & Timer State Architecture

### 4.1 Firebase & Auth Listeners
1. **Initialization:** `src/firebase/config.ts` initializes `app`, `auth`, `firestore`, `storage` from `NEXT_PUBLIC_FIREBASE_*` env vars inside `initializeFirebase()` (guarded by `typeof window !== 'undefined'`).
2. **Client Provider:** `src/firebase/client-provider.tsx` (`FirebaseClientProvider` in `src/app/layout.tsx`) runs `initializeFirebase()` inside `useEffect`, starting with `loading: true`.
3. **Auth State Hook:** `src/firebase/auth/use-user.ts` (`useUser()`) attaches `onAuthStateChanged(auth, ...)` per hook call. A module-level `lastSyncedUid` prevents duplicate `users/{uid}` profile creation/`lastLogin` writes across multiple `useUser()` consumers.
4. **Routing Guards:** Currently client-only (`useEffect` redirecting to `/login`). No `middleware.ts` or auth-hint cookies (`fenrir_authed`, `fenrir_start`) exist yet. Because `FirebaseClientProvider` starts with `loading: true`, every page initially renders `LoadingScreen` (or public `<Timer />` on `/`) before redirecting.

### 4.2 Every Location Where Timer State Lives
1. **Global Root Context — `src/hooks/use-timer.tsx` (`TimerProvider` & `useTimer`):**
   - Mounted in `src/app/layout.tsx` **above all routes**, so timer state already persists across navigation between `/`, `/rooms/[roomId]`, `/dashboard`, etc.
   - Subscribes to Firestore `timerStates/{user.uid}` (`TimerState`) and `users/{user.uid}` (`User`).
   - *Implementation detail to fix during Phase 1:* `timerStateRef` in `use-timer.tsx:56-62` is a `useRef` populated in `useEffect` and passed as `useDoc(timerStateRef.current)`, so the initial render passes `null` until another state change triggers re-render. Converting `timerStateRef` to `useMemo` ensures immediate deterministic subscription.
   - Local provider state: `displayTime`, `mode` (`'pomodoro' | 'stopwatch'`), `customDuration` (defaults to `25`, synced from `userData.settings.pomodoroDuration` when idle), `selectedSubjectId`, `activeFace` (`localStorage('timerFace')`), `intervalRef` (`1000ms` tick), `todayAccumulatedSecondsRef`, `todaySubjectAccumulatedSecondsRef`.
   - Enforces daily limits (6h per subject = `21600s`, 22h total = `79200s`), writes completed/stopped sessions (>5s) to `sessions`, updates aggregated totals & `streak` on `users/{uid}`.
2. **Standalone Timer UI — `src/components/app/timer/timer.tsx` + `style-selector.tsx`:**
   - Consumes `useTimer()`; owns `isAddSubjectOpen` state. `StyleSelector` manages `activeFace` and mutates `document.documentElement.setAttribute('data-theme', themeId)` (not persisted).
3. **Room Personal Timer UI — `src/components/app/rooms/room-personal-timer.tsx`:**
   - Consumes `useTimer()` directly; owns local `localDuration` input buffer and `isStopping` visual flash flag.
4. **Room Presence Mirroring — `src/hooks/use-room-presence.ts`:**
   - `useRoomPresence(roomId, subjects)` reads `useTimer()` (`mode`, `isActive`, `isPaused`, `isIdle`, `selectedSubjectId`), attaches an additional `onSnapshot` on `timerStates/{user.uid}` to read raw server-timestamp `startedAt`/`accumulatedTime`/`initialDuration`, and mirrors live timer state + user stats to `rooms/{roomId}/members/{user.uid}` every `2000ms` (and on unmount marks `timerStatus: 'stopped'`).
   - `useFinishBroadcast(roomId)` detects `isActive -> isIdle` in `useTimer()` and writes `finishedAt` on `rooms/{roomId}/members/{user.uid}` for 4 seconds.
5. **Member Live Timer Cards & Peer Sync — `src/components/app/rooms/member-timer-card.tsx` & `member-timer-grid.tsx`:**
   - Each `MemberTimerCard` runs a local `1000ms` interval computing live elapsed/remaining seconds from `member.startedAt`, `member.accumulatedTime`, `member.initialDuration`.
   - `MemberTimerGrid`'s `doSync` syncs the user's global `useTimer()` (`stop`, `handleModeChange`, `handleDurationChange`, `start`) to match a selected member's running timer.
6. **Shared Room Focus Timer — `src/components/app/rooms/shared-focus-panel.tsx`:**
   - **Independent of `useTimer()`**. Reads/writes `rooms/{roomId}.sharedFocus` (`status`, `mode: 'work' | 'break'`, `startedAt`, `workDuration`, `breakDuration`, `cycleCount`, `startedBy`). Room owner controls start/pause/resume/end and auto-transitions `work <-> break` when `remaining <= 0`.

---

## 5. Firestore Schemas (`src/lib/definitions.ts` & `firestore.rules`)

- `users/{uid}` (`User`): `uid`, `displayName`, `email`, `photoURL`, `createdAt`, `lastLogin`, `streak`, `lastStreakUpdate`, `todaySeconds`, `todaySessions`, `weeklySeconds`, `weeklySessions`, `monthlySeconds`, `monthlySessions`, `allTimeSeconds`, `allTimeSessions`, `currentSubjectTodaySeconds`, `todaySubjectBreakdown`, `fcmTokens`, `settings` (`UserSettings`: `pomodoroDuration`, `shortBreakDuration`, `longBreakDuration`, `sessionEndAlert`, `breakReminder`, `studyTargetHours`, `dashboardDensity`, `minimalMode`). Note: `firestore.rules` permits owner `create, get, update, delete` on `users/{uid}` without field-level allowlists, so additive `UserSettings` fields (`startPage`, `cyclesBeforeLongBreak`, `autoStartNextPhase`, `focusSound`, `focusAmbient`) are backwards-compatible.
- `timerStates/{uid}` (`TimerState`): `userId`, `status`, `mode`, `subjectId`, `startedAt`, `sessionStartTime`, `initialDuration`, `accumulatedTime`.
- `subjects/{id}` (`Subject`), `sessions/{id}` (`Session`), `habits/{id}` (`Habit`), `habitLogs/{id}` (`HabitLog`).
- `rooms/{roomId}` (`Room`), `rooms/{roomId}/members/{uid}` (`RoomMember`), `messages/{id}` (`RoomMessage`), `challenges/{id}` (`RoomChallenge`), `challengeProgress/{id}` (`RoomChallengeProgress`), `goals/{id}` (`RoomGoal`), `pairs/{id}` (`AccountabilityPair`), `sessionReactions/{id}` (`SessionReaction`).

---

## 6. Hardcoded Styles, Typography, Radii, Shadows, Icons & "AI-Designed" Tells

### 6.1 Global Theme & CSS Utilities (`src/app/globals.css`, `tailwind.config.ts`)
- Cold zinc dark mode (`--background: 240 10% 4%`, `themeColor: '#09090b'`, `--primary: 215 85% 55%`) plus 7 alternate `data-theme` palettes (`forest`, `ocean`, `sunset`, `matrix`, `aurora`, `crimson`, `sakura`).
- `.glass` (`bg-background/60 backdrop-blur-xl border border-white/10 dark:border-white/5`), `.glass-card` (`bg-white/50 dark:bg-black/40 backdrop-blur-md border border-white/20 dark:border-white/10`), `.text-gradient` (`bg-gradient-to-br from-foreground to-foreground/70`), `.breathing`, `.animate-pulse-slow`.
- `tailwind.config.ts`: Only `sans: ['var(--font-inter)']`; no serif font token; `--radius` set to `1rem`.

### 6.2 Hardcoded Colors, Gradients & Glow Shadows by Area
- **Layout / Shell (`layout.tsx`, `header.tsx`, `bottom-nav.tsx`, `login/page.tsx`):** `#09090b` themeColor; `bg-white/5`, `bg-white/10`, `bg-black/40`, `border-white/10`, `border-white/5`, `text-white`; orange streak badge (`bg-orange-100/50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border-orange-200/50`); `backdrop-blur-lg` / `backdrop-blur-xl` / `backdrop-blur-md`; `shadow-2xl`, `shadow-lg`, `shadow-primary/20`.
- **Timer & Faces (`timer.tsx`, `style-selector.tsx`, `faces/*.tsx`, `add/edit-subject-dialog.tsx`):** `style-selector.tsx` uses hardcoded hex palettes (`#3b82f6`, `#10b981`, `#0ea5e9`, `#f59e0b`, `#22c55e`, `#09090b`, `bg-white/95`), `backdrop-blur-2xl`, `shadow-[-20px_0_50px_rgba(0,0,0,0.5)]`, `shadow-[0_0_30px_-10px_rgba(var(--primary),0.2)]`. `retro-face.tsx` uses scanline gradients, `drop-shadow-[0_0_15px_...]`, `textShadow`. `analog-face.tsx` uses `.glass` and `backdrop-blur-md`. Subject dialogs hardcode 8 hex colors (`#3498DB`..`#34495E`).
- **Dashboard (`dashboard/page.tsx`, `overview.tsx`, `habit-analytics.tsx`, `recent-sessions.tsx`):** Heavy `.glass` / `.glass-card`, `text-gradient`, `bg-gradient-to-r from-primary/10`, uniform 6-card grid, `shadow-2xl`, `shadow-[0_0_20px_rgba(var(--primary),0.2)]`, `bg-emerald-500/10`, `text-amber-500`. `overview.tsx` uses `<linearGradient id="barGradient">` in Recharts.
- **Rooms (`rooms/page.tsx`, `rooms/[roomId]/page.tsx`, `src/components/app/rooms/*`, `use-room-theme.ts`):**
  - `use-room-theme.ts` & `room-theme-picker.tsx`: 8 neon multi-color gradients (`#7F00FF -> #E100FF`, `#f953c6 -> #b91d73`, `#4776E6 -> #8E54E9`, etc.) injected as `--primary` / `--ring` overrides and radial overlays.
  - `rooms/[roomId]/page.tsx`, `member-timer-card.tsx`, `member-grid.tsx`, `member-profile-drawer.tsx`, `room-leaderboard.tsx`, `room-member-stats.tsx`, `room-analytics.tsx`, `room-challenges.tsx`, `room-goal-board.tsx`, `room-personal-timer.tsx`, `shared-focus-panel.tsx`, `room-session-feed.tsx`, `accountability-pairs.tsx`, `standalone-chat.tsx`, `room-finish-fx.tsx`: Widespread `.glass`, `bg-black/40`, `bg-white/5`, `border-white/10`, `backdrop-blur-xl/2xl`, `shadow-xl/2xl`, `shadow-[0_0_10px_rgba(234,179,8,0.5)]`, hardcoded `green-400/500`, `yellow-400/500`, `orange-400/500`, `amber-400/700`, `emerald-500`, `red-400/500`, `slate-300`, `gray-400/500/600`, `#22c55e`, `#fbbf24`, `#888`.
- **Goals / Routine / Subjects / History / Settings:**
  - `goals/page.tsx`: `border-t-orange-500`, `text-orange-500`, `bg-orange-500`, `border-t-yellow-500`, `bg-yellow-100`, `bg-yellow-900/30`, `text-yellow-600`.
  - `routine/page.tsx` & `habits/*`: `starter-guide.tsx` uses `Sparkles`, `bg-gradient-to-r from-primary/20`, `rounded-[26px]`, `"Welcome to Habit Rituals"`; `progress-header.tsx` uses `emerald-500`; `definitions.ts` `HABIT_CATEGORY_META` hardcodes hexes (`#10b981`, `#f59e0b`, `#3b82f6`, `#64748b`, `#ec4899`, `#f97316`).
  - `subjects/page.tsx`, `history/page.tsx`, `settings/page.tsx`: `.glass`, `.glass-card`, `.text-gradient`, `bg-gradient-to-r`, `bg-white/5`, `bg-black/20`, `border-white/10`.
- **shadcn/ui Primitives (`src/components/ui/*`):** Standard `rounded-md`/`rounded-lg`, `shadow-sm`/`md`/`lg`, `bg-black/80` modal backdrops (`dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx`), `text-red-300`/`text-red-50` in `toast.tsx`.

### 6.3 Typography, Radii, Icons, Emojis & Copy Tells
- **Fonts & Weights:** Only `Inter` is loaded (`layout.tsx`). `font-black`, `font-bold`, `tracking-tighter`, and `uppercase tracking-[0.2em]` / `[0.3em]` / `[0.4em]` appear across nearly every page and card header. `tabular-nums` (`.timer-digit`) is missing on Dashboard, History, and Room Leaderboard/MemberStats numeric summaries.
- **Radii Mixing:** Codebase mixes `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-[26px]`, and `rounded-full`.
- **Non-Lucide Icons:** `FcGoogle` from `react-icons/fc` (`login/page.tsx`), inline `<svg>` empty-state graphic (`rooms/page.tsx`), `FenrirLogo` (`components/icons/index.tsx`), custom SVG rings (`ring-face.tsx`, `radial-face.tsx`, `room-personal-timer.tsx`), and `pihu-cat.tsx`.
- **Emojis in UI/Data:** `📋` (`routine/page.tsx`), `🔥` (`rooms/page.tsx`, `use-timer.tsx`, `room-streak-banner.tsx`), `🌟`/`🏆` (`room-streak-banner.tsx`), `🎯` (`room-finish-fx.tsx`, `room-theme-picker.tsx`), `🍅`/`⏱` (`room-personal-timer.tsx`), `🌿`/`💪` (`shared-focus-panel.tsx`), `💪🥗🧠💼🧘⭐` (`HABIT_CATEGORY_META`), `🔥✅📚💪⚡` (`session-reaction-bar.tsx`, `member-grid.tsx`), `👍❤️😂🔥😮` (`standalone-chat.tsx`), `💬🌌🌹🔮🌅🌊💚✨` (`use-room-theme.ts`), `✓`/`✅`/`⏸` (`room-challenges.tsx`, `member-profile-drawer.tsx`), and mascot emojis in `pihu-cat.tsx`.
- **AI-ish Copy:** `"Welcome Back!"` (`login/page.tsx`), `"Welcome to Habit Rituals"` + `Sparkles` (`starter-guide.tsx`), `"Ritual"` / `"Visual Rituals"` / `"Spectral Moods"` / `"Recent Rituals"` / `"ACCESS TEMPORAL ARCHIVE"` / `"Data Sovereignty"` / `"FENRIR.OS"` across pages.

---

## 7. Brief vs. Codebase Discrepancies & Decisions Needed Before Phase 1

1. **`/` vs. `/timer` & Room Auto-Open:**
   - Currently `/` redirects room members to `/rooms/[roomId]` and renders `<Timer />` otherwise (without requiring auth). Moving the standalone Timer to `/timer`, making `/` a smart entry (auth landing when logged out; middleware cookie redirect to `/rooms` or `fenrir_start` when logged in), and keeping `/rooms` auto-opening the user's single room aligns cleanly with the codebase's existing 1-room-at-a-time constraint (`createRoom`/`joinRoomByCode`).
2. **Two Timer Concepts Inside Rooms (`RoomPersonalTimer` vs. `SharedFocusPanel`):**
   - `RoomPersonalTimer` drives `useTimer()` (`timerStates/{uid}`), while `SharedFocusPanel` drives `rooms/{roomId}.sharedFocus` (owner-controlled synced work/break Pomodoro). `MemberTimerGrid` also has peer sync (`doSync`). Phase 3 & Phase 4 will preserve all Firestore writes/fields (`sharedFocus`, `timerStates`, `members/{uid}`) without changing schemas.
3. **Room Chat Themes (`use-room-theme.ts`) vs. "One Accent Only":**
   - Currently `rooms/[roomId]/page.tsx` overrides `--primary` and `--ring` with 8 vivid neon gradient themes (`aurora`, `rose`, `galaxy`, etc.) stored in `room.chatTheme`. Restyling to the brief's single warm-clay accent means either simplifying/remapping `CHAT_THEMES` to subtle editorial surface tints (keeping `room.chatTheme` field intact) or limiting theme overrides to the chat container only so room chrome keeps one accent.
4. **Watch Faces (`StyleSelector`) & `PihuCat` Mascot (`pihu-cat.tsx`):**
   - `StyleSelector` in `header.tsx` switches 5 watch faces (`digital`, `ring`, `analog`, `radial`, `retro`) and 5 `data-theme` palettes; `PihuCat` is a 2,129-line cartoon SVG cat rendered on `/`, `/login`, `/dashboard`, and `/rooms/[roomId]` using emojis, particles, and fixed colors. Both conflict with the "quiet, editorial, tactile" direction (`§1.1`, `§1.7`). Note: Keeping `PihuCat` behind an opt-in Settings toggle or removing it from non-room pages, and replacing `StyleSelector` with clean Focus Mode / Timer preferences, should be confirmed before Phase 1/4.
5. **ESLint Configuration:**
   - `npm run lint` cannot run non-interactively because no ESLint config or package is installed. Installing `eslint` + `eslint-config-next` (or adding `.eslintrc.json` matching Next 15) should be done in Phase 1 so `npm run lint` passes non-interactively after each phase.
6. **`public/sw.js` Tracking:**
   - `public/sw.js` is tracked in git and modified by every `npx next build` run. Consider keeping it updated on release/build commits or handling `sw.js` noise cleanly per phase.
