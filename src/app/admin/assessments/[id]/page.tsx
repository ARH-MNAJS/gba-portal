"use client";

import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { format } from "date-fns";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { getAllColleges } from "@/lib/utils/colleges";
import { CalendarRange, Clock, ArrowLeft, Users, Gamepad2 } from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface GameDetail {
  id: string;
  name: string;
  duration: number;
}

interface Assessment {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  duration: number;
  showReportAtEnd: boolean;
  allowQuestionSwitch: boolean;
  maxAttempts: number;
  assignedTo: string[];
  games: GameDetail[];
  createdAt: any;
  createdBy: string;
}

export default function AssessmentDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [collegeMap, setCollegeMap] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  
  // Unwrap params using React.use()
  const unwrappedParams = use(params);
  const [assessmentId] = useState(() => unwrappedParams.id);
  
  useEffect(() => {
    // Only run when assessmentId is set
    if (!assessmentId) return;
    
    async function fetchAssessmentDetails() {
      try {
        setLoading(true);
        
        // Fetch the assessment
        const assessmentRef = doc(db, "assessments", assessmentId);
        const assessmentSnap = await getDoc(assessmentRef);
        
        if (!assessmentSnap.exists()) {
          setError("Assessment not found");
          setLoading(false);
          return;
        }
        
        // Fetch colleges to map IDs to names
        const colleges = await getAllColleges();
        const collegeMapping: Record<string, string> = {};
        colleges.forEach(college => {
          collegeMapping[college.id] = college.name;
        });
        setCollegeMap(collegeMapping);
        
        // Process assessment data
        const data = assessmentSnap.data();
        setAssessment({
          id: assessmentSnap.id,
          name: data.name || "Untitled Assessment",
          description: data.description || "",
          startDate: data.startDate || "",
          endDate: data.endDate || "",
          duration: data.duration || 0,
          showReportAtEnd: data.showReportAtEnd || false,
          allowQuestionSwitch: data.allowQuestionSwitch || false,
          maxAttempts: data.maxAttempts || 1,
          assignedTo: data.assignedTo || [],
          games: data.games || [],
          createdAt: data.createdAt,
          createdBy: data.createdBy || "",
        });
        
      } catch (error) {
        console.error("Error fetching assessment:", error);
        setError("Failed to load assessment details");
      } finally {
        setLoading(false);
      }
    }
    
    fetchAssessmentDetails();
  }, [assessmentId]); // Only depends on the local state now

  // Format date safely
  const formatDateSafely = (dateString: string | null | undefined) => {
    if (!dateString) return "Not set";
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }
      return format(date, "PPP p");
    } catch (error) {
      return "Invalid date";
    }
  };

  // Get college names for assigned colleges
  const getAssignedCollegeNames = (assignedIds: string[] = []) => {
    if (!assignedIds.length) return "None";
    
    return assignedIds
      .map(id => collegeMap[id] || "Unknown College")
      .filter(name => name !== "Unknown College")
      .join(", ");
  };

  // Calculate total games duration
  const getTotalGamesDuration = (games: GameDetail[] = []) => {
    return games.reduce((total, game) => total + (game.duration || 0), 0);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center">
          <Skeleton className="h-8 w-[200px]" />
        </div>
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error || "Assessment could not be loaded"}</AlertDescription>
        <Button 
          variant="outline" 
          onClick={() => router.push("/admin/assessments")}
          className="mt-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Assessments
        </Button>
      </Alert>
    );
  }

  const totalGamesDuration = getTotalGamesDuration(assessment.games);

  return (
    <AuthGuard requiredRole="admin">
      <div className="container mx-auto py-6 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => router.push("/admin/assessments")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">{assessment.name}</h1>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline"
              onClick={() => router.push(`/admin/assessments/${assessment.id}/edit`)}
            >
              Edit Assessment
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            {/* Assessment Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Overview</CardTitle>
                <CardDescription>Assessment details and configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {assessment.description && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                    <p>{assessment.description}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Start Date</h3>
                    <div className="flex items-center">
                      <CalendarRange className="h-4 w-4 mr-2 text-muted-foreground" />
                      {formatDateSafely(assessment.startDate)}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">End Date</h3>
                    <div className="flex items-center">
                      <CalendarRange className="h-4 w-4 mr-2 text-muted-foreground" />
                      {formatDateSafely(assessment.endDate)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Assessment Duration</h3>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                      {assessment.duration} minutes
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Maximum Attempts</h3>
                    <p>{assessment.maxAttempts}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Show Report</h3>
                    <Badge variant={assessment.showReportAtEnd ? "default" : "outline"}>
                      {assessment.showReportAtEnd ? "Yes" : "No"}
                    </Badge>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Allow Game Switching</h3>
                    <Badge variant={assessment.allowQuestionSwitch ? "default" : "outline"}>
                      {assessment.allowQuestionSwitch ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Games List */}
            <Card>
              <CardHeader>
                <CardTitle>Games</CardTitle>
                <CardDescription>Games included in this assessment</CardDescription>
              </CardHeader>
              <CardContent>
                {assessment.games.length === 0 ? (
                  <div className="text-center p-6 text-muted-foreground">
                    No games added to this assessment
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assessment.games.map((game, index) => (
                      <div key={index} className="border p-4 rounded-md">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <Gamepad2 className="h-5 w-5 mr-3 text-primary" />
                            <div>
                              <h3 className="font-medium">{game.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                Duration: {game.duration} minutes
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <Badge variant="outline">Game {index + 1}</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium">
                        Total Games Duration: {totalGamesDuration} minutes
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Information */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Assignment</CardTitle>
                <CardDescription>Colleges assigned to this assessment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-start">
                  <Users className="h-5 w-5 mr-2 mt-0.5 text-muted-foreground" />
                  <div>
                    <h3 className="font-medium">Assigned To:</h3>
                    <p className="text-sm mt-1">
                      {getAssignedCollegeNames(assessment.assignedTo)}
                    </p>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="text-sm text-muted-foreground">
                  <p className="mb-1">Created: {assessment.createdAt ? format(assessment.createdAt.toDate(), "PPP") : "Unknown"}</p>
                  <p>Created By: {assessment.createdBy || "Admin"}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" variant="outline" onClick={() => router.push(`/admin/assessments/${assessment.id}/assign`)}>
                  Manage Assignments
                </Button>
                <Button className="w-full" variant="outline" onClick={() => router.push(`/admin/reports/assessments/${assessment.assignedTo[0] || ''}/${assessment.id}`)}>
                  View Reports
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
} 