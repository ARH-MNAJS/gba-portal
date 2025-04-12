"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Eye } from "lucide-react";
import { fetchUsers, fetchUserById } from "@/lib/actions/user-actions";
import { useSession } from "@/providers/session-provider";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { getCollegeById, getCollegeByAdminId, type College } from '@/lib/utils/colleges';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from "sonner";

interface Student {
  id: string;
  name: string;
  email: string;
  branch: string;
  year: string;
  createdAt: string;
}

interface CollegeData extends College {}

export default function CollegeStudentsPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [collegeInfo, setCollegeInfo] = useState<CollegeData | null>(null);
  const [collegeId, setCollegeId] = useState<string | null>(null);
  const studentsPerPage = 10;
  const [collegeName, setCollegeName] = useState<string>('College');
  
  // Get college ID either from session or from Firestore
  useEffect(() => {
    const getCollegeId = async () => {
      if (sessionLoading) return;
      
      // Add check for user existence to prevent error on sign out
      if (!user) {
        // User is not logged in or has signed out
        setLoading(false);
        return;
      }
      
      try {
        // If user is a college admin, get their college ID
        if (user.role === 'college' && user.college) {
          setCollegeId(user.college);
          return;
        }
        
        // If the user ID itself is a college ID, use it directly
        try {
          const college = await getCollegeById(user.id || '');
          if (college) {
            setCollegeId(college.id);
            return;
          }
        } catch (err) {
          console.log("User ID is not a direct college ID");
        }
        
        // Try to get college by admin ID
        if (user.id) {
          const college = await getCollegeByAdminId(user.id);
          if (college) {
            setCollegeId(college.id);
            return;
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
    };
    
    getCollegeId();
  }, [user, sessionLoading]);
  
  // Get college info once we have the college ID
  useEffect(() => {
    if (!collegeId) return;
    
    const fetchCollegeInfo = async () => {
      try {
        const college = await getCollegeById(collegeId);
        setCollegeInfo(college);
        setCollegeName(college.name);
      } catch (error) {
        console.error("Failed to fetch college information:", error);
        toast.error("Failed to load college information");
        setError("Failed to load college information");
      }
    };
    
    fetchCollegeInfo();
  }, [collegeId]);
  
  // Load students when the college info is available
  useEffect(() => {
    if (collegeInfo && collegeId) {
      loadStudents();
    }
  }, [collegeInfo, collegeId]);
  
  // Update filtered students when search term, branch filter, year filter, or students change
  useEffect(() => {
    let filtered = [...students];
    
    // Apply search filter
    if (searchTerm.trim() !== "") {
      const lowercasedFilter = searchTerm.toLowerCase();
      filtered = filtered.filter(student => {
        return (
          student.name?.toLowerCase().includes(lowercasedFilter) ||
          student.email.toLowerCase().includes(lowercasedFilter) ||
          student.branch?.toLowerCase().includes(lowercasedFilter) ||
          student.year?.toLowerCase().includes(lowercasedFilter)
        );
      });
    }
    
    // Apply branch filter
    if (branchFilter && branchFilter !== "all") {
      filtered = filtered.filter(student => student.branch === branchFilter);
    }
    
    // Apply year filter
    if (yearFilter && yearFilter !== "all") {
      filtered = filtered.filter(student => student.year === yearFilter);
    }
    
    setFilteredStudents(filtered);
    // Update pagination based on filtered results
    setTotalPages(Math.ceil(filtered.length / studentsPerPage));
  }, [searchTerm, branchFilter, yearFilter, students, studentsPerPage]);
  
  const loadStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!collegeId) {
        console.error("No college ID available");
        setStudents([]);
        setFilteredStudents([]);
        setError("No college ID found in your user profile");
        setLoading(false);
        return;
      }
      
      console.log("Starting to fetch students for college:", collegeId);
      
      // Call the server action to fetch all student users
      const result = await fetchUsers(1, 1000, "student"); // Get all students to filter client-side
      
      console.log("College ID to filter with:", collegeId);
      console.log("Total students fetched:", result.users.length);
      
      // Improve how we filter students to handle different formats of college IDs
      const collegeStudents = result.users.filter((student: any) => {
        // Handle null/undefined college values
        if (!student.college) return false;
        
        // Convert both to strings and trim for more reliable comparison
        const studentCollege = String(student.college || '').trim().toLowerCase();
        const currentCollegeId = String(collegeId).trim().toLowerCase();
        
        // Check for exact match or if either contains the other
        // This handles cases where the ID might be stored in different formats
        const isMatch = 
          studentCollege === currentCollegeId || 
          studentCollege.includes(currentCollegeId) || 
          currentCollegeId.includes(studentCollege);
        
        console.log(`Student ${student.email}: college=${studentCollege}, collegeId=${currentCollegeId}, match=${isMatch}`);
        
        return isMatch;
      });
      
      console.log("Filtered college students count:", collegeStudents.length);
      
      if (collegeStudents.length === 0) {
        console.log("No students found with primary method, trying direct Firestore query");
        
        // If no students found, try querying directly from Firestore
        try {
          const studentsRef = collection(db, 'students');
          const q = query(studentsRef, where('college', '==', collegeId));
          const querySnapshot = await getDocs(q);
          
          const firestoreStudents = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name || '',
              email: data.email || '',
              branch: data.branch || '',
              year: data.year || '',
              createdAt: data.createdAt || '',
            };
          });
          
          console.log("Students found via direct Firestore query:", firestoreStudents.length);
          
          // If still no students, try a more general query to get all students
          if (firestoreStudents.length === 0) {
            console.log("No students found with exact match, getting all students to filter manually");
            
            // Get all students and filter client-side with more flexible comparison
            const allStudentsSnapshot = await getDocs(collection(db, 'students'));
            const allStudents = allStudentsSnapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                name: data.name || '',
                email: data.email || '',
                branch: data.branch || '',
                year: data.year || '',
                createdAt: data.createdAt || '',
                college: data.college || '',
              };
            });
            
            // More flexible matching including case-insensitive comparison
            const manuallyFilteredStudents = allStudents.filter(student => {
              const studentCollege = String(student.college || '').toLowerCase().trim();
              const targetCollegeId = String(collegeId).toLowerCase().trim();
              
              return studentCollege.includes(targetCollegeId) || targetCollegeId.includes(studentCollege);
            });
            
            console.log("Students found after manual filtering:", manuallyFilteredStudents.length);
            
            if (manuallyFilteredStudents.length > 0) {
              setStudents(manuallyFilteredStudents);
              setFilteredStudents(manuallyFilteredStudents);
              setTotalStudents(manuallyFilteredStudents.length);
              setTotalPages(Math.ceil(manuallyFilteredStudents.length / studentsPerPage));
              
              setBranchFilter("all");
              setYearFilter("all");
              setLoading(false);
              return;
            }
          }
          
          // If we found students via first direct query, use those
          if (firestoreStudents.length > 0) {
            setStudents(firestoreStudents);
            setFilteredStudents(firestoreStudents);
            setTotalStudents(firestoreStudents.length);
            setTotalPages(Math.ceil(firestoreStudents.length / studentsPerPage));
            
            setBranchFilter("all");
            setYearFilter("all");
            setLoading(false);
            return;
          }
        } catch (firestoreError) {
          console.error("Error in direct Firestore query:", firestoreError);
          // Continue with the rest of the function since this is just a fallback
        }
      }
      
      // If we get here, either we found students with the primary method
      // or both methods failed to find students
      setStudents(collegeStudents);
      setFilteredStudents(collegeStudents);
      setTotalStudents(collegeStudents.length);
      setTotalPages(Math.ceil(collegeStudents.length / studentsPerPage));
      
      // Reset filters when loading new students
      setBranchFilter("all");
      setYearFilter("all");
    } catch (error: any) {
      console.error("Error fetching students:", error);
      setError(`Failed to load students: ${error.message || "Unknown error"}`);
      setStudents([]);
      setFilteredStudents([]);
    } finally {
      // Always set loading to false, no matter what
      console.log("Setting loading to false");
      setLoading(false);
    }
  };

  // Manual override for testing - REMOVE IN PRODUCTION
  const handleCollegeIdOverride = () => {
    if (!collegeId) {
      const newId = prompt("Enter college ID to use:", "2");
      if (newId) {
        setCollegeId(newId);
      }
    }
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const getCurrentPageStudents = () => {
    const start = (currentPage - 1) * studentsPerPage;
    const end = start + studentsPerPage;
    return filteredStudents.slice(start, end);
  };

  const renderPagination = () => {
    const pages = [];
    
    // Calculate page range to show (show 5 pages at most around current page)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    if (endPage - startPage < 4 && totalPages > 5) {
      startPage = Math.max(1, endPage - 4);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <PaginationItem key={i}>
          <PaginationLink
            isActive={i === currentPage}
            onClick={() => handlePageChange(i)}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (currentPage > 1) handlePageChange(currentPage - 1);
              }}
              className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
          
          {pages}
          
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (currentPage < totalPages) handlePageChange(currentPage + 1);
              }}
              className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  const pageStudents = getCurrentPageStudents();

  // Manually trigger a retry if needed
  const handleRetry = () => {
    if (collegeId) {
      loadStudents();
    }
  };

  if (loading) {
    return <div className="space-y-4">
      <Skeleton className="h-8 w-[200px]" />
      <Skeleton className="h-[400px] w-full" />
    </div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <AuthGuard requiredRole="college">
      <div className="container mx-auto py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h1 className="text-2xl font-bold mb-2 md:mb-0">Students - {collegeName}</h1>
          {collegeInfo && (
            <p className="text-sm text-muted-foreground">
              College: {collegeInfo.name}
            </p>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6 items-center justify-between">
          <div className="w-full md:w-1/3">
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full">
              <Select
                value={branchFilter}
                onValueChange={setBranchFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {collegeInfo?.branches.map((branch) => (
                    <SelectItem key={branch} value={branch}>
                      {branch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full">
              <Select
                value={yearFilter}
                onValueChange={setYearFilter}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {collegeInfo?.years.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Year</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2"></div>
                      <p className="text-sm text-muted-foreground">Loading...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    <div className="flex flex-col items-center justify-center">
                      <p className="text-sm text-destructive">{error}</p>
                      <Button onClick={handleRetry} className="mt-4">Retry</Button>
                      {!collegeId && (
                        <Button onClick={handleCollegeIdOverride} variant="outline" className="mt-2">
                          Set College ID Manually
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : pageStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    <p className="text-muted-foreground">No students found</p>
                  </TableCell>
                </TableRow>
              ) : (
                pageStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.name || "N/A"}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>{student.branch || "N/A"}</TableCell>
                    <TableCell>{student.year || "N/A"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/college/students/${student.id}`)}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex justify-center">
            {renderPagination()}
          </div>
        )}
        
        {/* Debug section for development/troubleshooting */}
        <div className="mt-8 border-t pt-4 text-xs text-muted-foreground">
          <details>
            <summary className="cursor-pointer">Debug Information</summary>
            <div className="mt-2 space-y-2 bg-muted p-2 rounded">
              <p>College ID: {collegeId || 'Not set'}</p>
              <p>College Name: {collegeName || 'Not set'}</p>
              <p>Total Students Found: {students.length}</p>
              <p>Total Filtered Students: {filteredStudents.length}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRetry} 
                className="mt-2"
              >
                Refresh Student Data
              </Button>
            </div>
          </details>
        </div>
      </div>
    </AuthGuard>
  );
} 