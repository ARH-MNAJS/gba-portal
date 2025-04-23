# GBA Portal

A web application for cognitive assessment through game-based exercises, built with Next.js, Tailwind CSS, and Firebase.

## Authentication.

This application uses Firebase Authentication for user management and security. The integration offers:

- Email/password-based authentication
- Role-based access control (admin, student, college)
- Protected routes
- Custom authentication flows

## Features

- **Authentication**: Secure login and registration
- **Role-based access**: Different dashboards for students, colleges, and admins
- **Admin dashboard**: Manage users, view reports, configure system
- **Student dashboard**: Take assessments, view progress, access reports
- **College dashboard**: View student performance, generate reports
- **Database**: Firebase Firestore database for storing user information and results

## Setup

1. Clone the repository
2. Install dependencies:
```
npm install
```
3. Copy `.env.local.example` to `.env.local` and fill in your Firebase details:
```
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
...
```
4. Start the development server:
```
npm run dev
```
5. Navigate to the Firebase setup page `/api/db-setup` to initialize the database

## Access Demo Accounts

After setting up the database, you can access the system using:

**Admin Account**
- Email: admin@example.com
- Password: admin123

## Deployment

You can deploy this application to Vercel with minimal configuration.

1. Connect your GitHub repository to Vercel
2. Set up environment variables
3. Deploy

## Tech Stack

- **Frontend**: Next.js with App Router, React, Tailwind CSS
- **UI Components**: Shadcn UI
- **Authentication**: Firebase Authentication
- **Database**: Firebase Firestore
- **State Management**: React hooks and context API
- **Forms**: React Hook Form with Zod validation
- **Styling**: TailwindCSS with typography plugin and animations

## Architecture

- **Authentication Logic**: Centralized authentication with Firebase Authentication
- **Component Structure**: Reusable React components with clear separation of concerns
- **Data Handling**: Server actions for data fetching and mutation
- **Security**: Role-based access control and route protection
- **Performance**: Optimized bundle sizes and code splitting
- **Database**: Structured Firestore collections

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
