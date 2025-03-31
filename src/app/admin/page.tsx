"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AuthGuard } from "@/components/auth-guard";
import { UserRole } from "@/lib/supabase";
import { Users, School, GamepadIcon, BarChart2 } from "lucide-react";

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const loading = status === "loading";
  const router = useRouter();

  // Admin dashboard content
  const Dashboard = () => (
    <>
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Students
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">120</div>
            <p className="text-xs text-muted-foreground">
              +5 from last week
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Colleges
            </CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15</div>
            <p className="text-xs text-muted-foreground">
              +2 from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Assessments
            </CardTitle>
            <GamepadIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">35</div>
            <p className="text-xs text-muted-foreground">
              Active assessments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completion Rate
            </CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78%</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>
      </div>
      
      <h2 className="text-xl font-medium mb-4">Quick Actions</h2>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              Add, edit, or remove users from the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Manage students, college administrators, and other admin users. Import users in bulk or add them individually.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push("/admin/user")}>
              Manage Users
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Assessment Setup</CardTitle>
            <CardDescription>
              Create and configure assessments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Create new assessments, configure settings, and assign to colleges or student groups.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => router.push("/admin/assessments")}>
              Manage Assessments
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Reports & Analytics</CardTitle>
            <CardDescription>
              View performance and engagement metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Access detailed reports on student performance, assessment completion rates, and engagement metrics.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => router.push("/admin/reports")}>
              View Reports
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  );

  // Use the AuthGuard component to protect this route
  return (
    <AuthGuard requiredRole="admin">
      <div className="container mx-auto py-6">
        <Dashboard />
      </div>
    </AuthGuard>
  );
} 