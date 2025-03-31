"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchUserById } from "@/lib/actions/user-actions";
import { AuthGuard } from "@/components/auth-guard";
import { useSession } from "@/providers/session-provider";
import collegesData from "@/data/colleges.json";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { use } from "react";

interface StudentDetails {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  college?: string;
  branch?: string;
  year?: string;
  createdAt?: string;
}

export default function StudentDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useSession();
  const [student, setStudent] = useState<StudentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collegeId, setCollegeId] = useState<string | null>(null);
  
  // Properly unwrap the params with React.use()
  const studentId = use(params).id;
  
  // First, get the college ID
  useEffect(() => {
    const getCollegeId = async () => {
      // If college ID is in the session, use it
      if (user?.college) {
        console.log("College ID found in session:", user.college);
        setCollegeId(user.college);
        return;
      }
      
      // Otherwise, fetch from Firestore directly
      if (user?.id) {
        try {
          console.log("Fetching college ID from Firestore for user ID:", user.id);
          
          // First try to get from colleges collection
          const collegeDoc = await getDoc(doc(db, 'colleges', user.id));
          
          if (collegeDoc.exists()) {
            const collegeData = collegeDoc.data();
            console.log("College data found in Firestore:", collegeData);
            
            if (collegeData.college) {
              console.log("College ID found in Firestore:", collegeData.college);
              setCollegeId(collegeData.college);
              return;
            }
          }
          
          // If not found, try to get from users collection
          const userDoc = await getDoc(doc(db, 'users', user.id));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log("User data found in Firestore:", userData);
            
            if (userData.role === 'college') {
              console.log("User is a college admin");
              
              // Try to get college ID from other collections
              const collegesQuery = query(
                collection(db, 'colleges'),
                where('email', '==', user.email)
              );
              
              const querySnapshot = await getDocs(collegesQuery);
              
              if (!querySnapshot.empty) {
                const collegeData = querySnapshot.docs[0].data();
                console.log("College data found by email query:", collegeData);
                
                if (collegeData.college) {
                  console.log("College ID found by email query:", collegeData.college);
                  setCollegeId(collegeData.college);
                  return;
                }
              }
            }
          }
          
          console.error("Failed to find college ID for user");
          setError("Could not find college ID for your user account");
          setLoading(false);
          
        } catch (err) {
          console.error("Error fetching college data:", err);
          setError("Error fetching college data");
          setLoading(false);
        }
      } else {
        console.error("No user ID available");
        setError("No user ID available in session");
        setLoading(false);
      }
    };
    
    getCollegeId();
  }, [user]);

  // Then, load student details when we have the college ID
  useEffect(() => {
    const loadStudentDetails = async () => {
      try {
        if (!studentId) {
          setError("Invalid student ID");
          setLoading(false);
          return;
        }
        
        if (!collegeId) {
          // Wait for college ID to be loaded
          return;
        }
        
        setLoading(true);
        const studentData = await fetchUserById(studentId);
        
        // Check if student belongs to the college user's institution using the fetched college ID
        // Use loose comparison to handle string/number type differences
        const collegeMatch = studentData.college === collegeId || studentData.college == collegeId;
        
        if (studentData.role !== 'student' || !collegeMatch) {
          console.error(`Permission denied: Student college=${studentData.college}, User college=${collegeId}`);
          setError("You don't have permission to view this student's details");
          setStudent(null);
        } else {
          setStudent(studentData as StudentDetails);
          setError(null);
        }
      } catch (err: any) {
        console.error("Error fetching student details:", err);
        setError(err.message || "Failed to load student details");
        setStudent(null);
      } finally {
        setLoading(false);
      }
    };

    loadStudentDetails();
  }, [studentId, collegeId]);

  // Function to get college name from ID
  const getCollegeNameById = (id?: string) => {
    if (!id) return "N/A";
    const college = collegesData.colleges.find(c => c.id === id || c.id == id);
    return college?.name || id;
  };

  // Format date string
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <AuthGuard requiredRole="college">
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Student Details</h1>
          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            Back
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Error</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              {collegeId ? (
                <p className="text-sm text-muted-foreground">College ID: {collegeId}</p>
              ) : (
                <p className="text-sm text-muted-foreground">College ID not found</p>
              )}
            </CardContent>
          </Card>
        ) : student ? (
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Student account details</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Full Name</dt>
                    <dd className="text-base">{student.name || "N/A"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                    <dd className="text-base">{student.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Phone Number</dt>
                    <dd className="text-base">{student.phone || "N/A"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Account Created</dt>
                    <dd className="text-base">{formatDate(student.createdAt)}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Academic Information</CardTitle>
                <CardDescription>Details about the student's academic profile</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">College</dt>
                    <dd className="text-base">{getCollegeNameById(student.college)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Branch</dt>
                    <dd className="text-base">{student.branch || "N/A"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Year</dt>
                    <dd className="text-base">{student.year || "N/A"}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Student Not Found</CardTitle>
              <CardDescription>The requested student could not be found.</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </AuthGuard>
  );
} 