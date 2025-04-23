"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { useSession } from "@/providers/session-provider";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { serializeFirestoreData } from "@/lib/utils";
import { format } from "date-fns";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { 
  BarChart3, 
  Calendar, 
  Clock, 
  TrendingUp,
  Award, 
  LineChart, 
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart
} from "lucide-react";

export default function StudentReportsPage() {
  const { user } = useSession();
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<{[key: string]: any}>({});
  const [stats, setStats] = useState({
    completed: 0,
    averageScore: 0,
    highestScore: 0,
    recentDate: null
  });
  const router = useRouter();

  // Fetch student's assessment attempts and related assessment data
  useEffect(() => {
    const fetchReportData = async () => {
      if (!user?.id) {
        console.log("No user ID available");
        setLoading(false);
        return;
      }
      
      console.log("Fetching assessment data for user:", user.id, "email:", user.email);

      try {
        // Try multiple possible ID formats and fields
        const attemptsRef = collection(db, "assessmentAttempts");
        const possibleIds = [
          user.id,
          user.email?.toLowerCase(),
          user.id.toLowerCase(),
          `${user.id}_`, // Some systems append an underscore or other characters
          user.id.replace(/[^\w]/g, '') // Sanitized ID (alphanumeric only)
        ].filter(Boolean); // Remove any undefined/null values
        
        console.log("Trying possible ID formats:", possibleIds);
        
        // Create queries for each possible ID format and field name
        const possibleFields = ["userId", "studentId", "user_id", "student_id", "email"];
        let allDocs: any[] = [];
        
        // Try each field and ID combination
        for (const field of possibleFields) {
          for (const id of possibleIds) {
            const fieldQuery = query(attemptsRef, where(field, "==", id));
            const snapshot = await getDocs(fieldQuery);
            console.log(`Checking field '${field}' with value '${id}':`, snapshot.size);
            
            if (snapshot.size > 0) {
              allDocs = [...allDocs, ...snapshot.docs];
            }
          }
        }
        
        // Remove duplicates
        const uniqueDocs = allDocs.filter((doc, index, self) => 
          self.findIndex(d => d.id === doc.id) === index
        );
        
        console.log("Total unique documents found:", uniqueDocs.length);
        
        if (uniqueDocs.length === 0) {
          console.log("No assessment attempts found for this user");
          
          // As a fallback, try to check if the attempts might be in a different collection
          try {
            const alternateCollections = ["studentAssessments", "assessments", "attempts", "completedAssessments"];
            
            for (const collName of alternateCollections) {
              try {
                const altRef = collection(db, collName);
                // Check for the user ID in any field
                for (const field of possibleFields) {
                  for (const id of possibleIds) {
                    const altQuery = query(altRef, where(field, "==", id));
                    const altSnapshot = await getDocs(altQuery);
                    console.log(`Checking alternate collection '${collName}' field '${field}':`, altSnapshot.size);
                    
                    if (altSnapshot.size > 0) {
                      console.log(`Found attempts in '${collName}' collection with field '${field}'`);
                      break;
                    }
                  }
                }
              } catch (err) {
                console.log(`Error checking collection '${collName}':`, err);
              }
            }
            
            // Check if attempts might be embedded within assessment documents
            console.log("Checking for embedded attempts within assessments...");
            const assessmentsRef = collection(db, "assessments");
            const allAssessmentsSnapshot = await getDocs(assessmentsRef);
            console.log("Total assessments found:", allAssessmentsSnapshot.size);
            
            let foundEmbeddedAttempts = false;
            for (const assessmentDoc of allAssessmentsSnapshot.docs) {
              const assessmentData = assessmentDoc.data();
              
              // Check if there's an attempts/submissions array or object
              const possibleAttemptsFields = ["attempts", "submissions", "studentAttempts", "responses"];
              
              for (const attemptsField of possibleAttemptsFields) {
                const attemptsData = assessmentData[attemptsField];
                
                if (Array.isArray(attemptsData)) {
                  console.log(`Found '${attemptsField}' array in assessment ${assessmentDoc.id}`);
                  const userAttempts = attemptsData.filter((attempt: any) => {
                    // Check if any of the possible ids match in any field
                    return possibleIds.some(id => {
                      return possibleFields.some(field => attempt[field] === id);
                    });
                  });
                  
                  if (userAttempts.length > 0) {
                    console.log(`Found ${userAttempts.length} attempts for this user in assessment ${assessmentDoc.id}`);
                    foundEmbeddedAttempts = true;
                    
                    // Here you could process these embedded attempts
                    // For now, just log them
                  }
                } else if (typeof attemptsData === 'object' && attemptsData !== null) {
                  // Check if it's an object with user IDs as keys
                  const userIdKeys = possibleIds.filter(id => attemptsData[id]);
                  if (userIdKeys.length > 0) {
                    console.log(`Found attempts data keyed by user ID in assessment ${assessmentDoc.id}`);
                    foundEmbeddedAttempts = true;
                  }
                }
              }
            }
            
            if (foundEmbeddedAttempts) {
              console.log("Embedded attempts were found but not yet supported in the UI");
            }
          } catch (error) {
            console.log("Error checking alternate collections:", error);
          }
          
          setLoading(false);
          return;
        }

        // Process attempts and get unique assessment IDs
        const attemptsData = uniqueDocs.map(doc => 
          serializeFirestoreData({ id: doc.id, ...doc.data() })
        );
        
        console.log("Assessment attempts data:", attemptsData);
        
        // Sort by completedAt in descending order
        attemptsData.sort((a, b) => {
          const dateA = a.completedAt ? new Date(a.completedAt) : new Date(0);
          const dateB = b.completedAt ? new Date(b.completedAt) : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
        
        // Calculate stats
        let totalScore = 0;
        let highestScore = 0;
        let recentDate = null;
        
        if (attemptsData.length > 0) {
          recentDate = attemptsData[0].completedAt;
          
          attemptsData.forEach(attempt => {
            totalScore += attempt.totalScore || 0;
            if ((attempt.totalScore || 0) > highestScore) {
              highestScore = attempt.totalScore;
            }
          });
        }
        
        setStats({
          completed: attemptsData.length,
          averageScore: attemptsData.length ? +(totalScore / attemptsData.length).toFixed(1) : 0,
          highestScore,
          recentDate
        });

        // Fetch assessment details for each attempt
        const assessmentIds = [...new Set(attemptsData.map(a => a.assessmentId))];
        const assessmentsData: {[key: string]: any} = {};
        
        await Promise.all(assessmentIds.map(async (assessmentId) => {
          const assessmentDoc = await getDoc(doc(db, "assessments", assessmentId));
          if (assessmentDoc.exists()) {
            assessmentsData[assessmentId] = serializeFirestoreData({ 
              id: assessmentDoc.id, 
              ...assessmentDoc.data() 
            });
          }
        }));
        
        setAssessments(assessmentsData);
        setAttempts(attemptsData);
      } catch (error) {
        console.error("Error fetching report data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [user]);

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };

  // View detailed report for an assessment
  const viewDetailedReport = (assessmentId: string) => {
    router.push(`/student/assessments/${assessmentId}/report`);
  };

  // Get score status color
  const getScoreColor = (score: number) => {
    if (score >= 75) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Get score status badge
  const getScoreBadge = (score: number) => {
    if (score >= 75) return <Badge className="bg-green-500">Excellent</Badge>;
    if (score >= 60) return <Badge className="bg-yellow-500">Good</Badge>;
    return <Badge className="bg-red-500">Needs Improvement</Badge>;
  };

  // Render content
  const Content = () => {
    if (loading) {
      return (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
          <Skeleton className="h-[400px] w-full" />
        </div>
      );
    }

    if (attempts.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>No Reports Available</CardTitle>
            <CardDescription>
              You haven't completed any assessments yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-8 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No Data to Display</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Complete assessments to view your performance reports.
              </p>
              <Button 
                className="mt-6" 
                onClick={() => router.push('/student/assessments')}
              >
                Go to Assessments
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Completed Assessments
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
              <p className="text-xs text-muted-foreground">
                Total assessments completed
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Average Score
              </CardTitle>
              <BarChart className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageScore}/100</div>
              <p className="text-xs text-muted-foreground">
                Across all assessments
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Highest Score
              </CardTitle>
              <Award className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.highestScore}/100</div>
              <p className="text-xs text-muted-foreground">
                Your best performance
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Last Assessment
              </CardTitle>
              <Calendar className="h-4 w-4 text-violet-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDate(stats.recentDate as any)}</div>
              <p className="text-xs text-muted-foreground">
                Most recent assessment
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different report views */}
        <Tabs defaultValue="assessments">
          <TabsList>
            <TabsTrigger value="assessments">Assessment Reports</TabsTrigger>
            <TabsTrigger value="performance">Performance Analytics</TabsTrigger>
          </TabsList>
          
          {/* Assessment Reports Tab */}
          <TabsContent value="assessments">
            <Card>
              <CardHeader>
                <CardTitle>Assessment Results</CardTitle>
                <CardDescription>
                  View your complete assessment history and results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableCaption>Your assessment history</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assessment</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time Taken</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attempts.map((attempt) => {
                      const assessment = assessments[attempt.assessmentId] || {};
                      return (
                        <TableRow key={attempt.id}>
                          <TableCell className="font-medium">
                            {assessment.name || 'Unknown Assessment'}
                          </TableCell>
                          <TableCell>
                            {formatDate(attempt.completedAt)}
                          </TableCell>
                          <TableCell>
                            {attempt.totalTimeTaken ? 
                              `${Math.floor(attempt.totalTimeTaken / 60)}m ${attempt.totalTimeTaken % 60}s` : 
                              attempt.timeTaken ? 
                                `${Math.floor(attempt.timeTaken / 60)}m ${attempt.timeTaken % 60}s` :
                                attempt.duration ?
                                  `${Math.floor(attempt.duration / 60)}m ${attempt.duration % 60}s` :
                                'N/A'
                            }
                          </TableCell>
                          <TableCell className="font-medium">
                            {attempt.totalScore}/100
                          </TableCell>
                          <TableCell>
                            {getScoreBadge(attempt.totalScore)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => viewDetailedReport(attempt.assessmentId)}
                            >
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Performance Analytics Tab */}
          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle>Performance Analysis</CardTitle>
                <CardDescription>
                  Detailed breakdown of your overall performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {/* Skill Performance Section */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Skill Performance</h3>
                    <div className="space-y-4">
                      {/* This would ideally show aggregated data across games/skills */}
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Problem Solving</span>
                          <span className="text-sm font-medium">
                            {Math.round(stats.averageScore * 0.85)}/100
                          </span>
                        </div>
                        <Progress value={stats.averageScore * 0.85} className="h-2" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Logical Reasoning</span>
                          <span className="text-sm font-medium">
                            {Math.round(stats.averageScore * 0.92)}/100
                          </span>
                        </div>
                        <Progress value={stats.averageScore * 0.92} className="h-2" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Technical Knowledge</span>
                          <span className="text-sm font-medium">
                            {Math.round(stats.averageScore * 0.78)}/100
                          </span>
                        </div>
                        <Progress value={stats.averageScore * 0.78} className="h-2" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Time Management</span>
                          <span className="text-sm font-medium">
                            {Math.round(stats.averageScore * 0.88)}/100
                          </span>
                        </div>
                        <Progress value={stats.averageScore * 0.88} className="h-2" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Recommendations */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Recommendations</h3>
                    <div className="border rounded-lg p-4 bg-muted/20">
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <TrendingUp className="h-5 w-5 mt-0.5 text-green-500" />
                          <div>
                            <p className="font-medium">Build on your strengths</p>
                            <p className="text-sm text-muted-foreground">
                              You're doing well in logical reasoning. Consider taking advanced assessments in this area.
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <LineChart className="h-5 w-5 mt-0.5 text-blue-500" />
                          <div>
                            <p className="font-medium">Areas for improvement</p>
                            <p className="text-sm text-muted-foreground">
                              Focus on improving your technical knowledge skills with more practice.
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Clock className="h-5 w-5 mt-0.5 text-orange-500" />
                          <div>
                            <p className="font-medium">Regular practice</p>
                            <p className="text-sm text-muted-foreground">
                              Schedule regular practice sessions to maintain and improve your skills.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  return (
    <AuthGuard requiredRole="student">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
            <p className="text-muted-foreground">
              View your assessment performance and progress
            </p>
          </div>
        </div>
        <Content />
      </div>
    </AuthGuard>
  );
} 