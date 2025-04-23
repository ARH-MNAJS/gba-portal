"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/providers/session-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AuthGuard } from "@/components/auth-guard";
import { BookOpen, Brain, Trophy, Clock, BookOpenCheck, TimerIcon } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, limit, Timestamp, DocumentData } from "firebase/firestore";
import { format } from "date-fns";

export default function StudentDashboardPage() {
  const { user, loading } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState({
    inProgress: { total: 0, recent: null },
    completed: { total: 0, avgScore: null },
    recentAssessment: null,
    totalTime: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [dataAvailable, setDataAvailable] = useState({
    inProgress: false,
    completed: false,
    avgScore: false,
    recent: false,
    time: false
  });

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!user?.id) return;
      
      setIsLoading(true);
      try {
        // Collection references
        const attemptsRef = collection(db, "assessmentAttempts");
        const assessmentsRef = collection(db, "assessments");
        
        // Try different user ID fields (userId, studentId, or email)
        const possibleIds = [user.id];
        if (user.email) possibleIds.push(user.email);
        
        // Query for user's assessment attempts
        let allAttempts: DocumentData[] = [];
        let userIdFieldFound = false;
        
        // Try each potential ID field
        for (const idField of ['userId', 'studentId', 'userEmail', 'email']) {
          for (const idValue of possibleIds) {
            const attemptsQuery = query(attemptsRef, where(idField, "==", idValue));
            const attemptsSnapshot = await getDocs(attemptsQuery);
            
            if (!attemptsSnapshot.empty) {
              userIdFieldFound = true;
              console.log(`Found ${attemptsSnapshot.size} attempts using field "${idField}" with value "${idValue}"`);
              
              attemptsSnapshot.forEach(doc => {
                allAttempts.push({ id: doc.id, ...doc.data() });
              });
            }
          }
        }
        
        if (!userIdFieldFound) {
          console.log("No assessment attempts found for this user. Checking alternative collections...");
          
          // Check other potential collections
          const alternativeCollections = ["studentAssessments", "attempts", "assessmentReports"];
          for (const colName of alternativeCollections) {
            try {
              const altCollectionRef = collection(db, colName);
              
              for (const idField of ['userId', 'studentId', 'userEmail', 'email']) {
                for (const idValue of possibleIds) {
                  const altQuery = query(altCollectionRef, where(idField, "==", idValue));
                  const altSnapshot = await getDocs(altQuery);
                  
                  if (!altSnapshot.empty) {
                    console.log(`Found ${altSnapshot.size} records in "${colName}" collection`);
                    
                    altSnapshot.forEach(doc => {
                      allAttempts.push({ id: doc.id, ...doc.data() });
                    });
                  }
                }
              }
            } catch (err) {
              console.log(`Collection "${colName}" not found or error accessing it`);
            }
          }
        }
        
        // Check assessments collection for active assessments
        let activeAssessments = 0;
        try {
          const activeAssessmentsQuery = query(
            assessmentsRef, 
            where("status", "==", "active")
          );
          const activeAssessmentsSnapshot = await getDocs(activeAssessmentsQuery);
          activeAssessments = activeAssessmentsSnapshot.size;
          console.log(`Found ${activeAssessments} active assessments`);
        } catch (err) {
          console.log("Error fetching active assessments:", err);
        }
        
        // Check reports collection specifically for completed assessments
        let completedReports = 0;
        try {
          const reportsRef = collection(db, "reports");
          for (const idField of ['userId', 'studentId']) {
            for (const idValue of possibleIds) {
              const reportsQuery = query(reportsRef, where(idField, "==", idValue));
              const reportsSnapshot = await getDocs(reportsQuery);
              completedReports += reportsSnapshot.size;
            }
          }
          console.log(`Found ${completedReports} reports in reports collection`);
        } catch (err) {
          console.log("Reports collection not found or error accessing it");
        }
        
        // Remove duplicates from allAttempts based on id
        const uniqueAttempts = Array.from(
          new Map(allAttempts.map(item => [item.id, item])).values()
        );
        
        console.log(`Found total ${uniqueAttempts.length} unique assessment attempts`);
        
        // Separate in-progress and completed attempts
        const inProgressAttempts = uniqueAttempts.filter(
          attempt => attempt.completed === false || attempt.status === 'in-progress'
        );
        
        const completedAttempts = uniqueAttempts.filter(
          attempt => attempt.completed === true || attempt.status === 'completed'
        );
        
        // Calculate metrics only if we have data
        let avgScore = null;
        let totalTimeTaken = null;
        
        if (completedAttempts.length > 0) {
          // Find attempts with score fields
          const attemptsWithScores = completedAttempts.filter(
            attempt => attempt.totalScore !== undefined || attempt.score !== undefined
          );
          
          if (attemptsWithScores.length > 0) {
            const totalScore = attemptsWithScores.reduce((sum, attempt) => {
              const score = attempt.totalScore !== undefined ? attempt.totalScore : attempt.score;
              return sum + (Number(score) || 0);
            }, 0);
            
            avgScore = Math.round(totalScore / attemptsWithScores.length);
          }
          
          // Find attempts with time fields
          const attemptsWithTime = completedAttempts.filter(
            attempt => attempt.totalTimeTaken !== undefined || 
                     attempt.timeTaken !== undefined || 
                     attempt.duration !== undefined
          );
          
          if (attemptsWithTime.length > 0) {
            totalTimeTaken = attemptsWithTime.reduce((sum, attempt) => {
              const time = attempt.totalTimeTaken !== undefined ? attempt.totalTimeTaken :
                          (attempt.timeTaken !== undefined ? attempt.timeTaken : attempt.duration);
              return sum + (Number(time) || 0);
            }, 0);
          }
        }
        
        // Get the most recent assessment (either in-progress or completed)
        let recentAssessment = null;
        
        if (uniqueAttempts.length > 0) {
          // Sort by various date fields
          const sortedAttempts = uniqueAttempts.sort((a, b) => {
            const aDate = a.startedAt || a.completedAt || a.createdAt || a.timestamp;
            const bDate = b.startedAt || b.completedAt || b.createdAt || b.timestamp;
            
            if (!aDate) return 1;
            if (!bDate) return -1;
            
            const aTime = aDate instanceof Timestamp ? aDate.toMillis() : 
                         (typeof aDate === 'object' && aDate._seconds ? aDate._seconds * 1000 : 
                         new Date(aDate).getTime());
                         
            const bTime = bDate instanceof Timestamp ? bDate.toMillis() : 
                         (typeof bDate === 'object' && bDate._seconds ? bDate._seconds * 1000 : 
                         new Date(bDate).getTime());
            
            return bTime - aTime;
          });
          
          if (sortedAttempts[0]) {
            const attempt = sortedAttempts[0];
            recentAssessment = {
              id: attempt.id,
              assessmentId: attempt.assessmentId,
              title: attempt.assessmentName || 'Recent Assessment',
              date: attempt.startedAt || attempt.completedAt || attempt.createdAt || attempt.timestamp,
              status: attempt.completed ? 'completed' : 'in-progress',
              score: attempt.totalScore || attempt.score
            };
          }
        }
        
        // Most recent in-progress assessment
        let recentInProgress = null;
        if (inProgressAttempts.length > 0) {
          const recent = inProgressAttempts[0];
          recentInProgress = {
            id: recent.id,
            assessmentId: recent.assessmentId,
            title: recent.assessmentName || "Continue Assessment"
          };
        }
        
        // Track which data points we actually have
        const availableData = {
          inProgress: inProgressAttempts.length > 0 || activeAssessments > 0,
          completed: completedAttempts.length > 0 || completedReports > 0,
          avgScore: avgScore !== null,
          recent: recentAssessment !== null,
          time: totalTimeTaken !== null
        };
        
        setDataAvailable(availableData);
        
        // Use the greater of in-progress attempts and active assessments
        const inProgressCount = Math.max(inProgressAttempts.length, activeAssessments);
        
        // Use the greater of completed attempts and completed reports
        const completedCount = Math.max(completedAttempts.length, completedReports);
        
        setStats({
          inProgress: { 
            total: inProgressCount,
            recent: recentInProgress
          },
          completed: { 
            total: completedCount,
            avgScore: avgScore
          },
          recentAssessment: recentAssessment,
          totalTime: totalTimeTaken
        });
      } catch (error) {
        console.error("Error fetching student data:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user?.id) {
      fetchStudentData();
    }
  }, [user]);

  // Format time in hours and minutes
  const formatTime = (seconds) => {
    if (!seconds) return "0h 0m";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return "Not available";
    
    try {
      const date = timestamp instanceof Timestamp 
        ? timestamp.toDate() 
        : (typeof timestamp === 'object' && timestamp._seconds 
          ? new Date(timestamp._seconds * 1000)
          : new Date(timestamp));
          
      return format(date, "MMM d, yyyy");
    } catch (e) {
      console.error("Date formatting error:", e);
      return "Invalid date";
    }
  };

  // Student dashboard content
  const Dashboard = () => (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Student Dashboard</h1>
        <div className="text-sm text-muted-foreground">
          Welcome, {user?.name || user?.email}
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              In Progress
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : stats.inProgress.total}</div>
            <p className="text-xs text-muted-foreground">
              Assessments to be completed
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completed
            </CardTitle>
            <BookOpenCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : stats.completed.total}</div>
            <p className="text-xs text-muted-foreground">
              Assessments finished
            </p>
          </CardContent>
        </Card>
        
        {stats.recentAssessment ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Recent Activity
              </CardTitle>
              <div className={`h-2 w-2 rounded-full ${
                stats.recentAssessment.status === 'completed' 
                  ? 'bg-green-500' 
                  : 'bg-blue-500'
              }`} />
            </CardHeader>
            <CardContent>
              <div className="mb-2">
                <div className="font-medium text-sm truncate">{stats.recentAssessment.title}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(stats.recentAssessment.date)}
                </div>
              </div>
              {stats.recentAssessment.score !== undefined && (
                <div className="flex justify-between items-center mt-1 text-xs">
                  <span>Score:</span>
                  <span className="font-medium">{stats.recentAssessment.score}/100</span>
                </div>
              )}
              <Button 
                variant="outline"
                size="sm"
                onClick={() => router.push(
                  stats.recentAssessment.status === 'completed'
                    ? `/student/assessments/${stats.recentAssessment.assessmentId}/report`
                    : `/student/assessments/${stats.recentAssessment.id}`
                )}
                className="w-full mt-2 text-xs"
              >
                {stats.recentAssessment.status === 'completed' ? 'View Report' : 'Continue'}
              </Button>
            </CardContent>
          </Card>
        ) : dataAvailable.avgScore ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Average Score
              </CardTitle>
              <Trophy className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "..." : stats.completed.avgScore}</div>
              <p className="text-xs text-muted-foreground">
                Points (out of 100)
              </p>
            </CardContent>
          </Card>
        ) : dataAvailable.time && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Time Spent
              </CardTitle>
              <TimerIcon className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "..." : formatTime(stats.totalTime)}</div>
              <p className="text-xs text-muted-foreground">
                On all assessments
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      
      <h2 className="text-xl font-medium mb-4">Quick Actions</h2>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.inProgress.recent ? (
          <Card>
            <CardHeader>
              <CardTitle>Continue Learning</CardTitle>
              <CardDescription>
                Pick up where you left off
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {`Continue with "${stats.inProgress.recent.title}"`}
              </p>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => router.push(`/student/assessments/${stats.inProgress.recent.id}`)}
                className="w-full"
              >
                Continue
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Start Assessment</CardTitle>
              <CardDescription>
                Begin a new assessment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Browse available assessments and start a new one to track your progress.
              </p>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => router.push("/student/assessments")}
                className="w-full"
              >
                View Assessments
              </Button>
            </CardFooter>
          </Card>
        )}
        
        <Card>
          <CardHeader>
            <CardTitle>View Reports</CardTitle>
            <CardDescription>
              Track your performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Access detailed reports of your assessment results and performance analytics.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push("/student/reports")} className="w-full">
              View Reports
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Practice Skills</CardTitle>
            <CardDescription>
              Improve your abilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Access cognitive games and exercises to enhance your skills.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push("/student/practice")} className="w-full">
              Practice Now
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );

  // Use the AuthGuard component to protect this route
  return (
    <AuthGuard requiredRole="student">
      <div className="container mx-auto py-6">
        <Dashboard />
      </div>
    </AuthGuard>
  );
} 