# FenrirStudy 
**View the full documentation here: [documentation.md](documentation.md)**


[![Vercel](https://img.shields.io/badge/Vercel-Deploy-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://fenrirstudy.vercel.app/)
[![Netlify](https://img.shields.io/badge/Netlify-Deploy-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)](https://fenrirstudy.netlify.app/)
[![Next.js](https://img.shields.io/badge/Next.js-Framework-000000?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Language-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind](https://img.shields.io/badge/TailwindCSS-Styling-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Database-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-00A0DF?style=for-the-badge)](LICENSE)

# Update v7.o 🐺
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
- Responsive layout with desktop rituals
- Light/Dark themes and multiple watch faces

## Tech Stack
- Next.js (App Router)
- TypeScript
- Tailwind CSS & shadcn/ui
- Firebase Firestore & Auth

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
Create a `.env.local` file with your Firebase credentials.

4. Run the Development Server
```bash
npm run dev
```

---

## License
This project is licensed under the [MIT License](LICENSE).
