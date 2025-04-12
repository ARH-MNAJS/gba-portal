"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "@/providers/session-provider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { serializeFirestoreData } from "@/lib/utils";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function StudentAssessmentsPage() {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [assessments, setAssessments] = useState<any[]>([]);
  const [filteredAssessments, setFilteredAssessments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useSession();
  const router = useRouter();

  // Load assessments assigned to this student
  useEffect(() => {
    const loadAssessments = async () => {
      if (!user?.id) return;

      setIsLoading(true);
      setError(null);
      
      try {
        console.log("Loading assessments for student:", user.id, user.email);
        
        // Get student data from students collection
        const studentRef = collection(db, "students");
        
        // Try to find student by ID first
        const studentByIdQuery = query(studentRef, where("id", "==", user.id));
        const studentByIdSnapshot = await getDocs(studentByIdQuery);
        
        let studentData;
        let studentCollege;
        
        if (!studentByIdSnapshot.empty) {
          // Found student by ID
          studentData = studentByIdSnapshot.docs[0].data();
          studentCollege = studentData.collegeId;
          console.log("Found student by ID, college:", studentCollege);
        } else if (user.email) {
          // Try to find student by email
          const studentByEmailQuery = query(studentRef, where("email", "==", user.email));
          const studentByEmailSnapshot = await getDocs(studentByEmailQuery);
          
          if (!studentByEmailSnapshot.empty) {
            studentData = studentByEmailSnapshot.docs[0].data();
            studentCollege = studentData.collegeId;
            console.log("Found student by email, college:", studentCollege);
          }
        }
        
        // If we still couldn't find the student or their college
        if (!studentCollege) {
          console.log("No collegeId found for student. Checking with field 'college' as fallback");
          
          // Check if using old field name 'college' instead of 'collegeId'
          if (studentData && studentData.college) {
            studentCollege = studentData.college;
            console.log("Found college using legacy field name:", studentCollege);
          } else {
            setError("Your account is not linked to any college. Please contact your administrator.");
            setIsLoading(false);
            return;
          }
        }
        
        // Get assessments assigned to this student's college
        console.log(`Fetching assessments for college: ${studentCollege}`);
        const assessmentsRef = collection(db, "assessments");
        const assessmentsByCollegeQuery = query(
          assessmentsRef, 
          where("assignedTo", "array-contains", studentCollege)
        );
        
        const assessmentsByCollegeSnapshot = await getDocs(assessmentsByCollegeQuery);
        console.log(`Found ${assessmentsByCollegeSnapshot.docs.length} assessments for college ${studentCollege}`);
        
        if (assessmentsByCollegeSnapshot.empty) {
          console.log("No assessments found for this college");
          setAssessments([]);
          setFilteredAssessments([]);
          setIsLoading(false);
          return;
        }
        
        // Get attempts by this student
        const attemptsRef = collection(db, "assessmentAttempts");
        const attemptsQuery = query(
          attemptsRef,
          where("studentId", "==", user.id)
        );
        const attemptsSnapshot = await getDocs(attemptsQuery);
        
        // Create a map of assessment ID to attempt
        const attemptsByAssessment: Record<string, any> = {};
        attemptsSnapshot.forEach((doc) => {
          const attempt = serializeFirestoreData({ id: doc.id, ...doc.data() });
          attemptsByAssessment[attempt.assessmentId] = attempt;
        });
        
        // Process assessments with attempt data
        const now = new Date();
        const assessmentList = assessmentsByCollegeSnapshot.docs.map((doc) => {
          const assessment = serializeFirestoreData({ id: doc.id, ...doc.data() });
          const attempt = attemptsByAssessment[assessment.id];
          
          // Calculate assessment status
          const startDate = new Date(assessment.startDate);
          const endDate = new Date(assessment.endDate);
          const hasStarted = now >= startDate;
          const hasEnded = now > endDate;
          const maxAttempts = assessment.maxAttempts || 1;
          const attemptCount = attempt ? 1 : 0; // Simple for now, can be expanded for multiple attempts
          const canTake = hasStarted && !hasEnded && attemptCount < maxAttempts;
          
          return {
            ...assessment,
            status: attempt 
              ? "completed" 
              : hasEnded 
                ? "expired" 
                : hasStarted 
                  ? "active" 
                  : "upcoming",
            attempt,
            canTake,
          };
        });
        
        setAssessments(assessmentList);
        setFilteredAssessments(assessmentList);
      } catch (error) {
        console.error("Error loading assessments:", error);
        setError("Failed to load assessments. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    loadAssessments();
  }, [user]);

  // Filter assessments when search term changes
  useEffect(() => {
    if (searchTerm) {
      const filtered = assessments.filter(assessment => 
        assessment.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredAssessments(filtered);
    } else {
      setFilteredAssessments(assessments);
    }
  }, [searchTerm, assessments]);

  // Format date and time
  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "PPp"); // Format: Mar 15, 2023, 3:25 PM
    } catch (error) {
      return "Invalid date";
    }
  };

  // Handle starting an assessment
  const handleStartAssessment = (assessmentId: string) => {
    router.push(`/student/assessments/${assessmentId}`);
  };

  // Handle viewing assessment report
  const handleViewReport = (assessmentId: string) => {
    router.push(`/student/assessments/${assessmentId}/report`);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Assessments</h1>
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assessments..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="my-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : filteredAssessments.length === 0 ? (
        <div className="bg-background border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">No Assessments Scheduled</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assessment Name</TableHead>
                <TableHead>Start Date & Time</TableHead>
                <TableHead>End Date & Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssessments.map((assessment) => (
                <TableRow key={assessment.id}>
                  <TableCell className="font-medium">{assessment.name}</TableCell>
                  <TableCell>{formatDateTime(assessment.startDate)}</TableCell>
                  <TableCell>{formatDateTime(assessment.endDate)}</TableCell>
                  <TableCell>{assessment.duration} minutes</TableCell>
                  <TableCell>
                    {assessment.status === "completed" ? (
                      <Button 
                        variant="outline"
                        onClick={() => handleViewReport(assessment.id)}
                      >
                        Show Report
                      </Button>
                    ) : assessment.canTake ? (
                      <Button 
                        onClick={() => handleStartAssessment(assessment.id)}
                      >
                        Take Test
                      </Button>
                    ) : assessment.status === "upcoming" ? (
                      <Button variant="outline" disabled>
                        Not Started Yet
                      </Button>
                    ) : (
                      <Button variant="outline" disabled>
                        Expired
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
} 