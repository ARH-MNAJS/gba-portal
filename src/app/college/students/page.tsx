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
import collegesData from "@/data/colleges.json";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

interface Student {
  id: string;
  name: string;
  email: string;
  branch?: string;
  year?: string;
  college?: string;
}

interface CollegeData {
  id: string;
  name: string;
  branches: string[];
  years: string[];
}

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
  
  // Get college ID either from session or from Firestore
  useEffect(() => {
    const getCollegeId = async () => {
      if (sessionLoading) return;
      
      
      // If college ID is in the session, use it
      if (user?.college) {
        setCollegeId(user.college);
        return;
      }
      
      // Otherwise, fetch from Firestore directly
      if (user?.id) {
        try {
          
          // First try to get from colleges collection
          const collegeDoc = await getDoc(doc(db, 'colleges', user.id));
          
          if (collegeDoc.exists()) {
            const collegeData = collegeDoc.data();
            
            if (collegeData.college) {
              setCollegeId(collegeData.college);
              return;
            }
          }
          
          // If not found, try to get from users collection
          const userDoc = await getDoc(doc(db, 'users', user.id));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            if (userData.role === 'college') {
              
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
  }, [user, sessionLoading]);
  
  // Get college info once we have the college ID
  useEffect(() => {
    if (!collegeId) return;
    
    console.log("Using college ID to find college info:", collegeId);
    console.log("All available colleges in data:", collegesData.colleges);
    
    // First try with strict equality
    let college = collegesData.colleges.find(c => c.id === collegeId);
    
    if (college) {
      console.log("MATCH FOUND - College data found for ID:", collegeId, college);
      setCollegeInfo(college);
    } else {
      console.warn("NO STRICT MATCH - Trying loose comparison");
      
      // Try with loose equality (in case of type mismatch)
      college = collegesData.colleges.find(c => c.id == collegeId);
      
      if (college) {
        console.log("LOOSE MATCH FOUND - College data found for ID:", collegeId, college);
        setCollegeInfo(college);
      } else {
        console.error("NO MATCH - College not found in colleges.json for ID:", collegeId);
        setError(`College ID ${collegeId} not found in database. Available IDs: ${collegesData.colleges.map(c => c.id).join(", ")}`);
      }
    }
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
          student.email.toLowerCase().includes(lowercasedFilter)
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
      
      // Filter students to only include those from the college user's institution
      const collegeStudents = result.users.filter((student: any) => {
        const match = student.college === collegeId || student.college == collegeId;
        console.log(`Student ${student.email}: college=${student.college}, collegeId=${collegeId}, match=${match}`);
        return match;
      });
      
      console.log("Filtered college students count:", collegeStudents.length);
      
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
    // If we have 7 or fewer pages, show all pages
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
        <PaginationItem key={page}>
          <PaginationLink
            isActive={page === currentPage}
            onClick={() => handlePageChange(page)}
          >
            {page}
          </PaginationLink>
        </PaginationItem>
      ));
    }
    
    // Otherwise, show a truncated list
    const items = [];
    
    // Always show first page
    items.push(
      <PaginationItem key={1}>
        <PaginationLink
          isActive={1 === currentPage}
          onClick={() => handlePageChange(1)}
        >
          1
        </PaginationLink>
      </PaginationItem>
    );
    
    // Calculate the range of pages to show
    let startPage = Math.max(2, currentPage - 2);
    let endPage = Math.min(totalPages - 1, currentPage + 2);
    
    // Ensure we always show 5 pages (if available)
    const numPagesShown = endPage - startPage + 1;
    if (numPagesShown < 5) {
      if (startPage === 2) {
        endPage = Math.min(totalPages - 1, endPage + (5 - numPagesShown));
      } else if (endPage === totalPages - 1) {
        startPage = Math.max(2, startPage - (5 - numPagesShown));
      }
    }
    
    // Add ellipsis if needed at the beginning
    if (startPage > 2) {
      items.push(
        <PaginationItem key="start-ellipsis">
          <span className="px-4">...</span>
        </PaginationItem>
      );
    }
    
    // Add the middle pages
    for (let page = startPage; page <= endPage; page++) {
      items.push(
        <PaginationItem key={page}>
          <PaginationLink
            isActive={page === currentPage}
            onClick={() => handlePageChange(page)}
          >
            {page}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    // Add ellipsis if needed at the end
    if (endPage < totalPages - 1) {
      items.push(
        <PaginationItem key="end-ellipsis">
          <span className="px-4">...</span>
        </PaginationItem>
      );
    }
    
    // Always show last page
    items.push(
      <PaginationItem key={totalPages}>
        <PaginationLink
          isActive={totalPages === currentPage}
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </PaginationLink>
        </PaginationItem>
    );
    
    return items;
  };

  const pageStudents = getCurrentPageStudents();

  // Manually trigger a retry if needed
  const handleRetry = () => {
    if (collegeId) {
      loadStudents();
    }
  };

  return (
    <AuthGuard requiredRole="college">
      <div className="container mx-auto py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h1 className="text-2xl font-bold mb-2 md:mb-0">Students</h1>
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
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  />
                </PaginationItem>
                
                {renderPagination()}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </AuthGuard>
  );
} 