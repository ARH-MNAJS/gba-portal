"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/providers/session-provider";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { StudentSidebar } from "@/components/student-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { AuthGuard } from "@/components/auth-guard";
import { UserRole } from "@/lib/auth-utils";

export default function StudentDashboardPage() {
  const { user, loading } = useSession();
  const router = useRouter();

  // Student dashboard content
  const Dashboard = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Welcome, {user?.name || user?.email}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">Student Dashboard</div>
          <p className="text-xs text-muted-foreground">
            Access your assessments and progress
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            In Progress Assessments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">3</div>
          <p className="text-xs text-muted-foreground">
            Continue where you left off
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Completed Assessments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">12</div>
          <p className="text-xs text-muted-foreground">
            View your scores and feedback
          </p>
        </CardContent>
      </Card>
    </div>
  );

  // Use the AuthGuard component to protect this route
  return (
    <AuthGuard requiredRole="student">
      <Dashboard />
    </AuthGuard>
  );
} 