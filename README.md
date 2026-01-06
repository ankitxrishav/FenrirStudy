# fenrirstudy 🐺 xyz

**Live Demo: [https://fenrirstudy.vercel.app/](https://fenrirstudy.vercel.app/)**

`fenrirstudy` is a modern, full-stack web application designed to help users track and analyze their study habits. It provides tools to time study sessions, organize subjects, and visualize progress over time, with the goal of enhancing focus and productivity.

![fenrirstudy Screenshot](https://user-images.githubusercontent.com/12345/your-screenshot-url.png) 
*Replace with a real screenshot URL after you upload one to your GitHub repo.*

---

### Core Features

- **User Authentication**: Secure sign-in with Google, with automatic profile creation.
- **Dual-Mode Study Timer**: Supports both **Pomodoro** (countdown) and **Stopwatch** (count-up) modes.
- **Subject Management**: Create, color-code, and archive study subjects.
- **Session Tracking**: Automatically saves all study sessions to a persistent database.
- **Data Visualization**: A dashboard with charts and stats to visualize your study habits.
- **Session History**: A detailed, filterable log of all past study sessions.
- **Customizable UI**:
    - Light and Dark modes.
    - Multiple timer themes (Default, Forest, Ocean, Sunset, Matrix).
    - Responsive layout with a toggle for side-by-side or stacked views on desktop.

---

### Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [ShadCN UI](https://ui.shadcn.com/)
- **Database**: [Firebase Firestore](https://firebase.google.com/docs/firestore)
- **Authentication**: [Firebase Authentication](https://firebase.google.com/docs/auth)
- **Deployment**: [Vercel](https://vercel.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)

---

## Getting Started

To run this project locally, follow these steps:

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/fenrirstudy.git
cd fenrirstudy
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

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

### 4. Run the Development Server

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
