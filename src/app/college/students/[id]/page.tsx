"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { AuthGuard } from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { doc, getDoc } from "firebase/firestore";
import { getCollegeById } from "@/lib/utils/colleges";

interface StudentDetails {
  id: string;
  name: string;
  email: string;
  phone: string;
  college: string;
  branch: string;
  year: string;
  createdAt?: string;
}

interface PageProps {
  params: {
    id: string;
  };
}

export default function StudentDetailsPage({ params }: PageProps) {
  const router = useRouter();
  const studentId = params.id;
  
  const [student, setStudent] = useState<StudentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collegeName, setCollegeName] = useState<string>('');
  
  useEffect(() => {
    loadStudentDetails(studentId);
  }, [studentId]);
  
  const loadStudentDetails = async (id: string) => {
    try {
      setLoading(true);
      
      // Get student document from Firestore
      const studentRef = doc(db, 'students', id);
      const studentDoc = await getDoc(studentRef);
      
      if (studentDoc.exists()) {
        const studentData = studentDoc.data();
        setStudent({ id: studentDoc.id, ...studentData } as StudentDetails);
        setError(null);
        
        if (studentData.college) {
          try {
            const college = await getCollegeById(studentData.college);
            setCollegeName(college.name);
          } catch (error) {
            console.error("Error fetching college name:", error);
            setCollegeName(studentData.college);
          }
        }
      } else {
        setError("Student not found");
        setStudent(null);
      }
    } catch (err: any) {
      console.error("Error loading student:", err);
      setError(err.message || "Failed to load student details");
      setStudent(null);
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (dateString?: string | any) => {
    if (!dateString) return 'Never';
    
    try {
      // Try to parse as ISO string first
      if (typeof dateString === 'string') {
        return new Date(dateString).toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      
      // Handle Firestore timestamp objects
      if (typeof dateString === 'object' && dateString !== null && 'toDate' in dateString && typeof dateString.toDate === 'function') {
        return dateString.toDate().toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      
      return 'Invalid date';
    } catch (e) {
      console.error("Error formatting date:", e);
      return String(dateString);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-[250px]" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
          <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
        </CardContent>
      </Card>
    );
  }

  if (!student) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Student Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p>The requested student could not be found.</p>
          <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <AuthGuard requiredRole="college">
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{student.name}</h1>
            <p className="text-muted-foreground">{student.email}</p>
          </div>
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Student Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                  <dd className="text-base">{student.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Phone</dt>
                  <dd className="text-base">{student.phone || 'Not provided'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">College</dt>
                  <dd className="text-base">{collegeName || student.college}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Branch</dt>
                  <dd className="text-base">{student.branch}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Year</dt>
                  <dd className="text-base">{student.year}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Registered On</dt>
                  <dd className="text-base">{formatDate(student.createdAt)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Game Stats</CardTitle>
            <CardDescription>
              Game statistics will be available in a future update
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Statistics for this student's game performance are not yet available.
            </p>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
} 