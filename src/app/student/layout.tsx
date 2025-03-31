"use client";

import { StudentSidebar } from "@/components/student-sidebar";
import { useSession } from "@/providers/session-provider";
import { Header } from "@/components/header";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // We don't need to check for login here since that happens
  // in the specific dashboard pages with the AuthGuard

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 md:pl-64">
        <StudentSidebar />
        <main className="container max-w-7xl mx-auto py-6 px-4">
          {children}
        </main>
      </div>
    </div>
  );
} 