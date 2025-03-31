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
import { fetchUsers, deleteUser } from "@/lib/actions/user-actions";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
}

export default function AdminUserPage() {
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
          user.phone?.toLowerCase().includes(lowercasedFilter) ||
          user.role.toLowerCase().includes(lowercasedFilter)
        );
      });
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Call the server action to fetch users
      const result = await fetchUsers(currentPage, usersPerPage);
      
      setUsers(result.users as User[]);
      setTotalPages(result.totalPages);
      setTotalUsers(result.totalUsers);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error(error.message || "Failed to fetch users");
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
      toast.success("User deleted successfully");
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(error.message || "Failed to delete user");
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

  return (
    <AuthGuard requiredRole="admin">
      <div className="container mx-auto py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h1 className="text-2xl font-bold mb-2 md:mb-0">User Management</h1>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline" 
              className="flex items-center gap-1"
              onClick={() => router.push("/admin/user/import")}
            >
              <UserPlus className="w-4 h-4" />
              <span>Add User</span>
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Input
              placeholder="Search by name, email, or role..."
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
                <TableHead className="w-12">S.No</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    {searchTerm ? "No users match your search" : "No users found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user, index) => (
                  <TableRow key={user.id}>
                    <TableCell>{(currentPage - 1) * usersPerPage + index + 1}</TableCell>
                    <TableCell className="font-medium">{user.name || "-"}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone || "-"}</TableCell>
                    <TableCell className="capitalize">{user.role}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/admin/user/${user.id}`)}
                          title="View User Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => confirmDelete(user)}
                          title="Delete User"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * usersPerPage) + 1}-
              {Math.min(currentPage * usersPerPage, totalUsers)} of {totalUsers} users
            </div>
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

        {/* Delete Confirmation Dialog */}
        <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {userToDelete?.name || userToDelete?.email}? 
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmDeleteOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteUser}
              >
                Delete User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
} 