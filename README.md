# CogniCore: Game-Based Assessment Platform

A web application for cognitive assessment through game-based exercises, built with Next.js, Tailwind CSS, and Supabase.

## Authentication System

This application uses NextAuth.js with Supabase for authentication. The integration offers:

- Secure JWT-based authentication
- Role-based access control
- Session management across tabs and page refreshes
- Protected routes based on user roles

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables:
   Copy `.env.local.example` to `.env.local` and fill in your Supabase and NextAuth details:
   ```
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

   # NextAuth
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-generated-secret
   ```
   
   You can generate a secure secret with:
   ```bash
   openssl rand -base64 32
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

## Database Schema

The application requires the following tables in your Supabase database:

1. `users` - Stores basic user information and their role
   - `id` (primary key, matches Supabase Auth UUID)
   - `email` (string, unique)
   - `role` (enum: 'student', 'admin', 'college')

2. `students` - Student-specific information
   - `id` (foreign key to users.id)
   - `name` (string)
   - `email` (string)
   - Additional student-specific fields

3. `admins` - Admin-specific information
   - `id` (foreign key to users.id)
   - `name` (string)
   - `email` (string)

4. `colleges` - College-specific information
   - `id` (foreign key to users.id)
   - `name` (string)
   - `email` (string)
   - `college` (string)

## Features

- Self-authenticating dashboard pages for different user roles
- Clean user interface with dark mode support
- Centralized authentication logic using NextAuth.js
- Secure session storage and management
- Protected routes based on user roles

## Technology Stack

- **Frontend**: Next.js, React, TailwindCSS, shadcn/ui
- **Authentication**: NextAuth.js with Supabase provider
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS with custom theming

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
