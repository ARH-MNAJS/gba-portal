"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AuthGuard } from "@/components/auth-guard";
import { Users, School, BarChart2, Brain } from "lucide-react";
import { useSession } from "@/providers/session-provider";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { subMonths } from "date-fns";
import { GAMES_METADATA } from "@/games/index";

export default function AdminDashboardPage() {
  const { user, loading } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState({
    students: { total: 0, growth: 0 },
    colleges: { total: 0, growth: 0 },
    assessments: { total: 0 },
    games: { total: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      setIsLoading(true);
      try {
        // Fetch colleges count
        const collegesRef = collection(db, 'colleges');
        const collegesSnapshot = await getDocs(collegesRef);
        const totalColleges = collegesSnapshot.size;
        
        // Get colleges created in the last month
        const oneMonthAgo = subMonths(new Date(), 1);
        let newColleges = 0;
        
        collegesSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.createdAt && 
             (data.createdAt instanceof Timestamp || 
              data.createdAt._seconds)) {
            const createdAt = data.createdAt instanceof Timestamp 
              ? data.createdAt.toDate() 
              : new Date(data.createdAt._seconds * 1000);
              
            if (createdAt >= oneMonthAgo) {
              newColleges++;
            }
          }
        });
        
        // Fetch students count from students collection
        const studentsRef = collection(db, 'students');
        const studentsSnapshot = await getDocs(studentsRef);
        const totalStudents = studentsSnapshot.size;
        
        // Estimate new students (5% of current students)
        const newStudents = Math.round(totalStudents * 0.05);
        
        // Fetch active assessments
        const assessmentsRef = collection(db, 'assessments');
        const activeAssessmentsQuery = query(
          assessmentsRef,
          where("status", "==", "active")
        );
        const activeAssessmentsSnapshot = await getDocs(activeAssessmentsQuery);
        const activeAssessments = activeAssessmentsSnapshot.size;
        
        // Count of predefined games
        const totalGames = GAMES_METADATA.length;
        
        setStats({
          students: { 
            total: totalStudents, 
            growth: newStudents 
          },
          colleges: { 
            total: totalColleges, 
            growth: newColleges 
          },
          assessments: { 
            total: activeAssessments 
          },
          games: {
            total: totalGames
          }
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
        // Set fallback values in case of error
        setStats({
          students: { total: 0, growth: 0 },
          colleges: { total: 0, growth: 0 },
          assessments: { total: 0 },
          games: { total: 0 }
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchStats();
  }, []);

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
            <div className="text-2xl font-bold">{isLoading ? "..." : stats.students.total}</div>
            <p className="text-xs text-muted-foreground">
              +{isLoading ? "..." : stats.students.growth} estimated new
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
            <div className="text-2xl font-bold">{isLoading ? "..." : stats.colleges.total}</div>
            <p className="text-xs text-muted-foreground">
              +{isLoading ? "..." : stats.colleges.growth} from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Assessments
            </CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : stats.assessments.total}</div>
            <p className="text-xs text-muted-foreground">
              Active assessments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Available Games
            </CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : stats.games.total}</div>
            <p className="text-xs text-muted-foreground">
              Predefined games
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
              Create new assessments, configure settings, assign to colleges and manage existing assessments and track their status in thier system.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push("/admin/assessments")}>
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
              Access detailed reports on student performance, attendance, assessment completion rates, and engagement metrics.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push("/admin/reports")}>
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