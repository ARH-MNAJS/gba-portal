"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthGuard } from "@/components/auth-guard";
import { UserRole } from "@/lib/supabase";

export default function CollegeDashboardPage() {
  const { data: session, status } = useSession();
  const loading = status === "loading";
  const router = useRouter();

  // College dashboard content
  const Dashboard = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Welcome, {session?.user?.name || session?.user?.email}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">College Dashboard</div>
          <p className="text-xs text-muted-foreground">
            Manage your students and assessments
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Students
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">47</div>
          <p className="text-xs text-muted-foreground">
            Enrolled from your college
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Assessments Completed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">24</div>
          <p className="text-xs text-muted-foreground">
            By students from your college
          </p>
        </CardContent>
      </Card>
    </div>
  );

  // Use the AuthGuard component to protect this route
  return (
    <AuthGuard requiredRole="college">
      <Dashboard />
    </AuthGuard>
  );
} 