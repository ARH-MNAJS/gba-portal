import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { DatabaseInitializer } from "@/components/database-initializer";
import { SessionProvider } from '@/providers/session-provider';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "XcelIQ | Game-Based Assessments",
  description: "Enhance your recruitment with our game-based assessments platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <ThemeProvider defaultTheme="system" storageKey="xceliq-theme">
          <SessionProvider>
            {children}
            <Toaster position="top-right" />
            <DatabaseInitializer />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
