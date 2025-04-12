"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getCollegeById } from "@/lib/utils/colleges";
import { db } from "@/lib/firebase";
import { doc, getDoc, getDocs, collection, setDoc, query, where } from "firebase/firestore";

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

export default function StudentDetailsPage() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [collegeName, setCollegeName] = useState<string>('');
  
  useEffect(() => {
    // Get student ID from URL path
    const path = window.location.pathname;
    const studentId = path.split('/').pop() || '';
    
    loadStudentDetails(studentId);
  }, []);
  
  const loadStudentDetails = async (studentId: string) => {
    try {
      setLoading(true);
      
      // Fetch student directly from students collection
      const studentDoc = await getDoc(doc(db, 'students', studentId));
      
      if (!studentDoc.exists()) {
        throw new Error('Student not found');
      }
      
      const studentData = studentDoc.data();
      const studentDetails = {
        id: studentId,
        name: studentData.name || '',
        email: studentData.email || '',
        phone: studentData.phone || '',
        college: studentData.collegeId || studentData.college || '',
        branch: studentData.branch || '',
        year: studentData.year || '',
        createdAt: studentData.createdAt ? 
          (typeof studentData.createdAt === 'object' && studentData.createdAt?.seconds ? 
            new Date(studentData.createdAt.seconds * 1000).toISOString() : 
            studentData.createdAt.toString()) : '',
      };
      
      setStudent(studentDetails);
      
      // If the student has a college ID, get the college name
      if (studentDetails.college) {
        try {
          // Query the colleges collection to find a document where collegeId matches the student's college
          const collegesRef = collection(db, 'colleges');
          const q = query(collegesRef, where("collegeId", "==", studentDetails.college));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            // Use the first matching college's name
            setCollegeName(querySnapshot.docs[0].data().name || studentDetails.college);
            console.log(`Found college name for ID ${studentDetails.college}:`, querySnapshot.docs[0].data().name);
          } else {
            console.log(`No college found with collegeId ${studentDetails.college}`);
            setCollegeName(studentDetails.college);
          }
        } catch (error) {
          console.error("Error fetching college name:", error);
          setCollegeName(studentDetails.college);
        }
      }
    } catch (error: any) {
      console.error('Error fetching student details:', error);
      toast.error(error.message || 'Failed to fetch student details');
      router.push('/admin/user/students');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not available';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderStudentInfo = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      );
    }

    if (!student) return <p>No student data found.</p>;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Name</Label>
              <p className="text-lg font-medium">{student.name || 'Not specified'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="text-lg font-medium">{student.email}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Phone</Label>
              <p className="text-lg font-medium">{student.phone || 'Not specified'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Academic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">College</Label>
              <p className="text-lg font-medium">{collegeName || 'Not specified'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Branch</Label>
              <p className="text-lg font-medium">{student.branch || 'Not specified'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Year</Label>
              <p className="text-lg font-medium">{student.year || 'Not specified'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Account Created</Label>
              <p className="text-lg font-medium">{formatDate(student.createdAt)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <AuthGuard requiredRole="admin">
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Student Details</h1>
            {!loading && student && (
              <p className="text-muted-foreground">{student.name} ({student.email})</p>
            )}
          </div>
          <Button variant="outline" onClick={() => router.push('/admin/user/students')}>
            Back to Students
          </Button>
        </div>

        {renderStudentInfo()}
      </div>
    </AuthGuard>
  );
} 