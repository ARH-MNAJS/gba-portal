"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Eye, Trash2, UserPlus } from "lucide-react";
import { fetchUsers } from "@/lib/actions/user-actions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { db } from "@/lib/firebase";
import { doc, deleteDoc, getDoc, collection, getDocs, setDoc } from "firebase/firestore";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  college?: string;
}

export default function AdminStudentsPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const usersPerPage = 10;
  const [collegeNames, setCollegeNames] = useState<Record<string, string>>({});

  // Fetch users on load and when page changes
  useEffect(() => {
    loadUsers();
  }, [currentPage]);

  // Update filtered users when search term or users change
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredUsers(users);
    } else {
      const lowercasedFilter = searchTerm.toLowerCase();
      const filtered = users.filter(user => {
        return (
          user.name?.toLowerCase().includes(lowercasedFilter) ||
          user.email.toLowerCase().includes(lowercasedFilter) ||
          user.phone?.toLowerCase().includes(lowercasedFilter)
        );
      });
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  // Initialize the colleges collection with basic data if needed
  useEffect(() => {
    const initCollegesIfNeeded = async () => {
      try {
        // Check if colleges collection has any documents
        const collegesSnapshot = await getDocs(collection(db, 'colleges'));
        if (collegesSnapshot.empty) {
          console.log('Colleges collection is empty, initializing with default data');
          
          // Add a default college entry for any existing students
          await setDoc(doc(db, 'colleges', 'default'), {
            name: 'Default College',
            branches: ['General', 'Computer Science', 'Electrical Engineering', 'Mechanical Engineering'],
            years: ['1', '2', '3', '4'],
            createdAt: new Date(),
          });
          console.log('Created default college entry');
        } else {
          console.log(`Found ${collegesSnapshot.size} colleges in database`);
        }
      } catch (error) {
        console.error('Error checking/initializing colleges collection:', error);
      }
    };
    
    initCollegesIfNeeded();
  }, []);

  // Fetch college names when users are loaded
  useEffect(() => {
    if (users.length === 0) return;

    const fetchCollegeNames = async () => {
      console.log('===== DEBUGGING COLLEGE NAMES =====');
      console.log('Users with college IDs:', users.map(u => ({ id: u.id, name: u.name, college: u.college })));

      const collegeNamesMap: Record<string, string> = {};

      // Fetch all college documents into a map for quick lookup
      try {
        const collegesRef = collection(db, 'colleges');
        const collegesSnapshot = await getDocs(collegesRef);
        const collegesMap = new Map();

        // Create a map of collegeId to college name
        collegesSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.collegeId) {
            collegesMap.set(data.collegeId, data.name);
          }
        });

        console.log('Colleges map:', Object.fromEntries(collegesMap));

        // For each user, fetch their corresponding student record to get collegeId
        await Promise.all(users.map(async (user) => {
          try {
            // Get the student document directly
            const studentDoc = await getDoc(doc(db, 'students', user.id));
            if (studentDoc.exists()) {
              const studentData = studentDoc.data();
              const collegeId = studentData.collegeId || studentData.college;
              console.log(`Student ${user.id} college ID:`, collegeId);
              
              // Look up the college name in the map
              if (collegeId && collegesMap.has(collegeId)) {
                collegeNamesMap[user.id] = collegesMap.get(collegeId);
              } else {
                collegeNamesMap[user.id] = 'Unknown College';
              }
            }
          } catch (error) {
            console.error(`Error fetching student data for ${user.id}:`, error);
            collegeNamesMap[user.id] = 'Error Loading';
          }
        }));

        console.log('Final college names map:', collegeNamesMap);
        setCollegeNames(collegeNamesMap);
      } catch (error) {
        console.error('Error fetching colleges:', error);
      }
    };

    fetchCollegeNames();
  }, [users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      console.log('AdminStudentsPage: Loading students, page:', currentPage);
      
      const result = await fetchUsers(currentPage, usersPerPage, "student");
      console.log('AdminStudentsPage: Student data loaded:', result);
      
      if (!result || !result.users || result.users.length === 0) {
        console.log('AdminStudentsPage: No student data returned');
        setUsers([]);
        setFilteredUsers([]);
        setTotalPages(1);
        setTotalUsers(0);
      } else {
        setUsers(result.users as User[]);
        setFilteredUsers(result.users as User[]);
        setTotalPages(result.totalPages);
        setTotalUsers(result.totalUsers);
        console.log('AdminStudentsPage: Set student data in state:', result.users.length);
      }
    } catch (error: any) {
      console.error("AdminStudentsPage: Error fetching students:", error);
      toast.error(error.message || "Failed to fetch students");
      setUsers([]);
      setFilteredUsers([]);
      setTotalPages(1);
      setTotalUsers(0);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (user: User) => {
    setUserToDelete(user);
    setConfirmDeleteOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      // Delete from students collection with better error handling
      const studentRef = doc(db, 'students', userToDelete.id);
      const studentDoc = await getDoc(studentRef);
      
      if (!studentDoc.exists()) {
        throw new Error('Student record not found');
      }
      
      await deleteDoc(studentRef);
      
      // Update UI
      setUsers(users.filter(user => user.id !== userToDelete.id));
      setFilteredUsers(filteredUsers.filter(user => user.id !== userToDelete.id));
      toast.success("Student deleted successfully");
    } catch (error: any) {
      console.error("Error deleting student:", error);
      toast.error(error.message || "Failed to delete student");
    } finally {
      setConfirmDeleteOpen(false);
      setUserToDelete(null);
    }
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
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
          <PaginationLink disabled>...</PaginationLink>
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
          <PaginationLink disabled>...</PaginationLink>
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

  return (
    <AuthGuard requiredRole="admin">
      <div className="container mx-auto py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h1 className="text-2xl font-bold mb-2 md:mb-0">Student Management</h1>
          <Button onClick={() => router.push('/admin/user/students/import-students')} className="ml-auto">
            <UserPlus className="mr-2 h-4 w-4" /> Add Student
          </Button>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>College</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2"></div>
                      <p className="text-sm text-muted-foreground">Loading students...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    <p className="text-muted-foreground">No students found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name || "N/A"}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone || "N/A"}</TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="max-w-[200px] inline-block truncate">
                              {collegeNames[user.id] || 'N/A'}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{collegeNames[user.id] || 'N/A'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.push(`/admin/user/students/${user.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>View student details</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => confirmDelete(user)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) handlePageChange(currentPage - 1);
                    }}
                    className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                    aria-disabled={currentPage <= 1}
                  />
                </PaginationItem>
                
                {renderPagination()}
                
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages) handlePageChange(currentPage + 1);
                    }}
                    className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                    aria-disabled={currentPage >= totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

        <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {userToDelete?.name || userToDelete?.email}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteUser}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
