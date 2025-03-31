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
import { Eye, Trash2, UserPlus, Upload } from "lucide-react";
import { fetchUsers, deleteUser } from "@/lib/actions/user-actions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import collegesData from "@/data/colleges.json";

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

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Call the server action to fetch users with role filter
      const result = await fetchUsers(currentPage, usersPerPage, "student");
      
      setUsers(result.users as User[]);
      setTotalPages(result.totalPages);
      setTotalUsers(result.totalUsers);
    } catch (error: any) {
      console.error("Error fetching students:", error);
      toast.error(error.message || "Failed to fetch students");
      setUsers([]);
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
      // Call the server action to delete the user
      await deleteUser(userToDelete.id);
      
      // Update UI
      setUsers(users.filter(user => user.id !== userToDelete.id));
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

  // Function to get college name from ID
  const getCollegeNameById = (id: string) => {
    const college = collegesData.colleges.find(c => c.id === id);
    return college?.name || id;
  };

  return (
    <AuthGuard requiredRole="admin">
      <div className="container mx-auto py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h1 className="text-2xl font-bold mb-2 md:mb-0">Student Management</h1>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              className="flex items-center gap-1 cursor-pointer"
              onClick={() => router.push("/admin/user/import")}
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Student</span>
            </Button>
          </div>
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
                      {user.college ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="max-w-[200px] inline-block truncate">
                                {getCollegeNameById(user.college)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{getCollegeNameById(user.college)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/admin/user/${user.id}`)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
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
                    onClick={() => handlePageChange(currentPage - 1)}
                    isDisabled={currentPage === 1}
                  />
                </PaginationItem>
                
                {renderPagination()}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => handlePageChange(currentPage + 1)}
                    isDisabled={currentPage === totalPages}
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