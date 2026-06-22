# FenrirStudy 
**View the full documentation here: [documentation.md](documentation.md)**


[![Vercel](https://img.shields.io/badge/Vercel-Deploy-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://fenrirstudy.vercel.app/)
[![Netlify](https://img.shields.io/badge/Netlify-Deploy-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)](https://fenrirstudy.netlify.app/)
[![Next.js](https://img.shields.io/badge/Next.js-Framework-000000?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Language-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind](https://img.shields.io/badge/TailwindCSS-Styling-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Database-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-Media-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)](https://cloudinary.com/)
[![License](https://img.shields.io/badge/License-MIT-00A0DF?style=for-the-badge)](LICENSE)


<a href="https://www.producthunt.com/products/fenrirstudy?embed=true&amp;utm_source=badge-featured&amp;utm_medium=badge&amp;utm_campaign=badge-fenrirstudy" target="_blank" rel="noopener noreferrer"><img alt="fenrirstudy - Study, track, analyze, and improve your focus | Product Hunt" width="250" height="54" src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1173505&amp;theme=dark&amp;t=1781789932414"></a>


# Update v9.0 🐺
<h3> HD Photo Sharing, Advanced Chat & Security Hardening </h3>

- **HD Photo Sharing in Rooms**: Send photos in real-time inside any study room chat. Images are uploaded in full HD quality via Cloudinary (free tier) and are displayed in a stunning fullscreen zoomable lightbox.
- **24-Hour Auto-Deletion Engine**: Every photo sent in a room is automatically wiped after 24 hours — both from Cloudinary CDN and Firestore — with zero server-side cost. The chat retains the message text with a clean "Photo deleted (24h limit)" placeholder.
- **Manual Image Deletion**: The sender or room owner can manually delete any photo at any time with a one-click confirm flow from the message hover menu.
- **Advanced Hover Action Menu**: A sleek, animated action bar appears on hover over any chat message, featuring **Reply**, **React** (emoji), **Copy Text**, and **Delete Image** — all context-aware based on permissions.
- **Emoji Reactions**: React to any message with 👍 ❤️ 😂 🔥 😮. Reaction counts appear as animated badges below bubbles. Tap to toggle your own reaction on or off.
- **Nested Replies**: Quote and reply to any message or photo. The original content is shown as an embedded mini-bubble inside the new message.
- **Live Upload Progress Bar**: A smooth progress bar tracks photo uploads in real-time using XHR.
- **Tightened Firestore Security Rules**: Reactions, image deletion, and message creation are now protected by granular field-level diff rules — preventing privilege escalation or unauthorized data manipulation.
- **Security Test Suite**: A full automated security test script (`17/17 passed`) validates auth gates, privilege escalation prevention, data integrity constraints, and Cloudinary API route credential safety.
- **Secure Cloudinary Integration**: All Cloudinary API communication (upload & delete) is proxied through server-side Next.js Route Handlers — your API Secret is never exposed to the browser.

# Update v8.1 🐺
<h3> RPG Leveling, Subject Breakdowns & Pihu Expansion </h3>

- **RPG Leveling System**: Earn XP and level up based on your daily study hours and total sessions. The leveling curve becomes progressively harder to encourage long-term consistency. Levels are displayed on the Dashboard and Room banners.
- **Dynamic Milestones**: Streak goals and target milestones scale automatically alongside your RPG level.
- **Live Room Subject Breakdowns**: The Member Stats Overview now displays a color-coded breakdown of every subject a user has studied today, including live time tracking for their currently active subject.
- **Cascading Deletions**: Deleting a subject now safely and automatically removes all associated study sessions to keep analytics accurate.
- **Pihu The Mascot Expansion**: Pihu now greets you on the Login page and hangs out on the Dashboard.
- **Shared Room Goals**: Any member in a room can now check off shared goals, fostering a collaborative study environment.
- **Robust Presence Sync**: Fixed issues where members would become "zombies" or get missing permissions errors after deleting or leaving rooms.

# Update v8.0 🐺
<h3> Co-Study Rooms & Live Accountability </h3>

- **Virtual Study Rooms**: Create and join private study rooms using 6-character invite codes.
- **Live Sync Timers**: Seamlessly synchronize your local Pomodoro or Stopwatch with any active member in the room.
- **Pihu The Mascot**: A highly interactive, animated feline companion that reacts to your current study state and provides motivation.
- **Real-Time Presence Engine**: A robust backend architecture that tracks live status ('studying', 'idle', 'offline') across the room.
- **Accountability Pairs**: Form accountability pairs with other members and send real-time emoji reactions to boost morale.
- **Secure Room Management**: Owners have full control to manage settings, moderate members, and seamlessly delete rooms.
<h3> Habit Intelligence & Unified Dashboard </h3>

- **Unified Dashboard Migration**: Successfully migrated habit analytics into the main Dashboard. Switch seamlessly between study performance and habit consistency with a tabbed interface.
- **Habit Intelligence System**: Advanced tracking for habit streaks, completion rates, and temporal heatmaps, now unified with study session intelligence.
- **Starter Rituals**: Automatic seeding of core habits (Deep Work, Health, Exercise) for new users to ensure a resonant start.
- **Interactive Starter Guide**: An animated, dismissible onboarding guide for the habit system to help users master their routine.
- **Time-Windowed Completion**: Habits can now have specific start and end times, enforcing discipline and preventing "backfilling" for past or future dates.
- **Mobile Touch Optimization**: Re-engineered the habit list and date selector with native-feel scroll-snap and tap-friendly "More" menus for the ultimate smartphone experience.
- **PWA Excellence**: Optimized the progressive web app for quick access to routine management on both iOS and Android.

Modern, full-stack study tracker to time sessions, manage subjects, and visualize study habits.

## Live Demos
- Vercel: https://fenrirstudy.vercel.app/
- Netlify: https://fenrirstudy.netlify.app/

## Core Features
- Secure Google Authentication (Firebase Auth)
- Dual-mode timer: Pomodoro and Stopwatch
- Subject management: create, color-code, archive
- Automatic session tracking and persistence
- Virtual Study Rooms with real-time presence
- HD Photo Sharing with 24h auto-expiry (Cloudinary)
- Advanced Room Chat: replies, reactions, lightbox
- Responsive layout with desktop rituals
- Light/Dark themes and multiple watch faces

## Tech Stack
- Next.js 15 (App Router + Route Handlers)
- TypeScript
- Tailwind CSS & shadcn/ui
- Firebase Firestore & Auth
- Cloudinary (HD media hosting)
- Framer Motion (animations)

## Getting Started (Local)

1. Clone the Repository
```bash
git clone https://github.com/ankitxrishav/FenrirStudy.git
cd FenrirStudy
```

2. Install Dependencies
```bash
npm install
```

3. Set Up Environment Variables  
Create a `.env.local` file with your Firebase and Cloudinary credentials:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
```

4. Run the Development Server
```bash
npm run dev
```

---

## License
This project is licensed under the [MIT License](LICENSE).
