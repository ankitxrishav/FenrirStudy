# fenrirstudy 🐺

[![Deploy: Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)](https://fenrirstudy.vercel.app/)
[![Deploy: Netlify](https://img.shields.io/badge/Deploy-Netlify-00C7B7?logo=netlify&logoColor=white)](https://fenrirstudy.netlify.app/) <!-- Replace with your Netlify site URL -->
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

Live demo (Vercel): https://fenrirstudy.vercel.app/  
Live demo (Netlify): https://fenrirstudy.netlify.app/  <!-- Replace this with your Netlify URL -->

A modern full-stack app to track and analyze study habits — Pomodoro/Stopwatch timers, subjects, session history, and analytics.

Core Features
- User Authentication (Google)
- Pomodoro & Stopwatch modes
- Subject creation, color-coding, archiving
- Persistent session tracking (Firestore)
- Dashboard with charts & stats
- Filterable session history
- Light/Dark themes and timer themes (Default, Forest, Ocean, Sunset, Matrix)
- Responsive layout with side-by-side / stacked view toggle

Quick demo screenshot
<!-- Replace with your screenshot path or hosted image -->
![App Screenshot]<img width="1439" height="845" alt="Screenshot 2026-01-02 at 2 24 36 PM" src="https://github.com/user-attachments/assets/11df56e5-8c33-467e-bc33-fba5bb1f422f" />
<img width="1479" height="852" alt="Screenshot 2026-01-02 at 2 25 07 PM" src="https://github.com/user-attachments/assets/92b35ed6-619a-419d-8a3c-e480e622f786" />


Tech Stack
- Next.js (App Router)
- Tailwind CSS & shadcn/ui
- Firebase Firestore & Auth
- TypeScript
- Vercel / Netlify for deployment

Getting Started (local)
1. Clone
```bash
git clone https://github.com/your-username/fenrirstudy.git
cd fenrirstudy
```
2. Install
```bash
npm install
```
3. Environment variables
Create a `.env.local` in project root and add Firebase credentials:

```
NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-auth-domain"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-storage-bucket"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-messaging-sender-id"
NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="your-measurement-id"
```

4. Run development server
```bash
npm run dev
```
Open http://localhost:9002

Deploying
- Vercel: Connect repo, add the same environment variables in Vercel project settings, and deploy.
- Netlify: Connect repo or drag-and-drop build output. Set environment variables in Netlify site settings. Build command: `npm run build`, Publish directory: `.next` (or see Netlify docs for Next.js).

Notes & Tips
- Replace the Netlify demo URL above with your actual Netlify site.
- Add app logos to `public/` and update the screenshot/OG image paths.
- For analytics charts, verify Firestore rules and seeded data for demos.

Contributing
- Fork -> branch -> PR. Please include descriptive commit messages and tests for new features where applicable.

License
MIT — see LICENSE

Acknowledgements
- Built with Next.js, Tailwind CSS, Firebase, and shadcn/ui.

<!-- end of file -->
