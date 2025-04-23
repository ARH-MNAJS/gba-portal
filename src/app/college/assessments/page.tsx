"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search, Eye, FileText, BarChart3 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  Timestamp,
  where,
  DocumentData
} from "firebase/firestore";
import { AuthGuard } from "@/components/auth-guard";
import { useSession } from "@/providers/session-provider";

interface Assessment {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  assignedTo: string[];
  games: Array<{ id: string; name: string; duration: number }>;
  createdAt: Timestamp;
  status: string;
  attempts?: number;
  completions?: number;
}

export default function CollegeAssessmentsPage() {
  const router = useRouter();
  const { user } = useSession();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredAssessments, setFilteredAssessments] = useState<Assessment[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    upcoming: 0,
    completed: 0
  });

  // Fetch assessments from Firestore
  useEffect(() => {
    async function fetchAssessments() {
      if (!user?.collegeId) {
        console.log("No college ID found in user session");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Create query to get assessments assigned to this college
        const assessmentsCollection = collection(db, "assessments");
        const assessmentsQuery = query(
          assessmentsCollection,
          where("assignedTo", "array-contains", user.collegeId),
          orderBy("createdAt", "desc")
        );
        
        // Execute query
        const querySnapshot = await getDocs(assessmentsQuery);
        
        if (querySnapshot.empty) {
          console.log("No assessments found for this college");
          setAssessments([]);
          setStats({
            total: 0,
            active: 0,
            upcoming: 0,
            completed: 0
          });
        } else {
          // Process results
          const assessmentsData = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name || "Untitled Assessment",
              description: data.description || "",
              startDate: data.startDate || "",
              endDate: data.endDate || "",
              assignedTo: data.assignedTo || [],
              games: data.games || [],
              createdAt: data.createdAt,
              status: data.status || "inactive",
              attempts: 0,
              completions: 0
            } as Assessment;
          });
          
          console.log("Fetched assessments:", assessmentsData.length);
          
          // Fetch assessment statistics
          const now = new Date();
          for (const assessment of assessmentsData) {
            try {
              // Fetch attempts for this assessment from this college
              const attemptsRef = collection(db, "assessmentAttempts");
              const attemptsQuery = query(
                attemptsRef,
                where("assessmentId", "==", assessment.id),
                where("collegeId", "==", user.collegeId)
              );
              const attemptsSnapshot = await getDocs(attemptsQuery);
              
              // Count total attempts and completed attempts
              assessment.attempts = attemptsSnapshot.size;
              assessment.completions = attemptsSnapshot.docs.filter(
                doc => doc.data().completed === true
              ).length;
              
            } catch (err) {
              console.error("Error fetching attempts data:", err);
            }
          }
          
          // Calculate statistics
          const stats = {
            total: assessmentsData.length,
            active: assessmentsData.filter(a => a.status === "active").length,
            upcoming: assessmentsData.filter(a => {
              if (!a.startDate) return false;
              const startDate = new Date(a.startDate);
              return startDate > now && a.status !== "completed";
            }).length,
            completed: assessmentsData.filter(a => a.status === "completed").length
          };
          
          setAssessments(assessmentsData);
          setStats(stats);
        }
      } catch (error) {
        console.error("Error fetching assessments:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAssessments();
  }, [user]);

  // Filter assessments based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredAssessments(assessments);
    } else {
      const filtered = assessments.filter((assessment) =>
        assessment.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredAssessments(filtered);
    }
  }, [searchTerm, assessments]);

  // Get status badge for an assessment
  const getStatusBadge = (assessment: Assessment) => {
    const now = new Date();
    const startDate = assessment.startDate ? new Date(assessment.startDate) : null;
    const endDate = assessment.endDate ? new Date(assessment.endDate) : null;
    
    if (assessment.status === "completed") {
      return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Completed</Badge>;
    }
    
    if (assessment.status === "active") {
      if (endDate && endDate < now) {
        return <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100">Expired</Badge>;
      }
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">Active</Badge>;
    }
    
    if (startDate && startDate > now) {
      return <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100">Upcoming</Badge>;
    }
    
    return <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100">Inactive</Badge>;
  };

  // Safely format date strings
  const formatDateSafely = (dateString: string | null | undefined) => {
    if (!dateString) return "Not set";
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }
      
      return format(date, "PPP");
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Invalid date";
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-10 w-[150px]" />
        </div>
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Skeleton className="h-[100px] w-full" />
          <Skeleton className="h-[100px] w-full" />
          <Skeleton className="h-[100px] w-full" />
          <Skeleton className="h-[100px] w-full" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <AuthGuard requiredRole="college">
      <div className="w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">College Assessments</h1>
          <Button variant="outline" onClick={() => router.push("/college/reports")}>
            <BarChart3 className="mr-2 h-4 w-4" />
            View Reports
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcoming}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assessments..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>College Assessments</CardTitle>
            <CardDescription>
              View assessments assigned to your college and track student progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredAssessments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? "No matching assessments found" : "No assessments assigned to your college yet"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Completions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssessments.map((assessment) => (
                    <TableRow key={assessment.id}>
                      <TableCell className="font-medium">
                        {assessment.name}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(assessment)}
                      </TableCell>
                      <TableCell>
                        {formatDateSafely(assessment.startDate)}
                      </TableCell>
                      <TableCell>
                        {formatDateSafely(assessment.endDate)}
                      </TableCell>
                      <TableCell>{assessment.attempts}</TableCell>
                      <TableCell>{assessment.completions}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/college/assessments/${assessment.id}`)}
                          title="View Assessment Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/college/assessments/${assessment.id}/report`)}
                          title="View Assessment Report"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
} 