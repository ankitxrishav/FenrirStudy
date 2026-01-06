# fenrirstudy 🐺

[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://fenrirstudy.vercel.app/)
[![Netlify](https://img.shields.io/badge/Deploy-Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)](https://fenrirstudy.netlify.app/)
[![Next.js](https://img.shields.io/badge/Framework-Next.js-000000?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind](https://img.shields.io/badge/Styling-Tailwind%20CSS-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Database-Firebase-FFCA28?style=flat-square&logo=firebase)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-00A0DF?style=flat-square)](LICENSE)

Modern, full-stack study tracker to time sessions, manage subjects, and visualize study habits.

Screenshots
- Add screenshots to /public or repo and replace the URL below:
![fenrirstudy Screenshot](https://user-images.githubusercontent.com/12345/your-screenshot-url.png)

Live Demos
- Vercel: https://fenrirstudy.vercel.app/
- Netlify: https://fenrirstudy.netlify.app/

Quick Links
- Repo: (your repository)
- Docs: This README covers local setup, env vars, and deployment steps.

Core Features
- Secure Google Authentication (Firebase Auth) with automatic profile creation
- Dual-mode timer: Pomodoro (countdown) and Stopwatch (count-up)
- Subject management: create, color-code, archive
- Automatic session tracking (persisted to Firestore)
- Dashboard with charts and session history
- Light/Dark themes and multiple timer themes
- Responsive layout with desktop view toggles

Tech Stack
- Next.js (App Router)
- TypeScript
- Tailwind CSS & shadcn/ui
- Firebase Firestore & Auth
- Vercel / Netlify deployment

Getting Started (Local)

1. Clone the Repository

```bash
git clone https://github.com/your-username/fenrirstudy.git
cd fenrirstudy
```

2. Install Dependencies

```bash
npm install
```

3. Set Up Environment Variables

Create a `.env.local` file in your project root and add your Firebase project credentials. You can get these from your Firebase project settings.

```
NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-auth-domain"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-storage-bucket"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-messaging-sender-id"
NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="your-measurement-id"
```

4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the result.

---

## Deploying on Vercel

To deploy this application on Vercel:

1.  Push your code to a Git repository (like GitHub).
2.  Connect your repository to Vercel.
3.  During the setup process on Vercel, add the same environment variables from your `.env.local` file into the project settings.
4.  Deploy! Vercel will automatically build and deploy your Next.js application.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
