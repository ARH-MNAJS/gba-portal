"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  UserPlus, 
  ChevronRight,
  Eye,
  Trash2,
  Loader2
} from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { getAllColleges, type College } from "@/lib/utils/colleges";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { doc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteUser } from "@/lib/actions/user-actions";

export default function CollegeUsersPage() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [filteredColleges, setFilteredColleges] = useState<College[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchColleges = async () => {
      setLoading(true);
      try {
        // Get all colleges with admin info embedded
        const collegesList = await getAllColleges();
        setColleges(collegesList);
        setFilteredColleges(collegesList);
      } catch (error) {
        console.error("Error fetching colleges:", error);
        toast.error("Failed to load colleges data");
      } finally {
        setLoading(false);
      }
    };

    fetchColleges();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredColleges(colleges);
      return;
    }

    const filtered = colleges.filter((college) =>
      college.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      college.adminName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      college.adminEmail?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredColleges(filtered);
  }, [searchTerm, colleges]);

  const handleViewCollege = (collegeId: string) => {
    router.push(`/admin/user/college/${collegeId}`);
  };
  
  const handleDeleteCollege = async (collegeId: string, adminId?: string) => {
    setDeleting(collegeId);
    try {
      // Check if there are any students associated with this college
      // We need to check multiple possible field names since students might reference 
      // colleges in different ways
      const studentsRef = collection(db, "students");
      
      // Check for field 'college'
      const q1 = query(studentsRef, where("college", "==", collegeId));
      const snapshot1 = await getDocs(q1);
      
      // Check for field 'collegeId'
      const q2 = query(studentsRef, where("collegeId", "==", collegeId));
      const snapshot2 = await getDocs(q2);
      
      const totalStudents = snapshot1.size + snapshot2.size;
      
      if (totalStudents > 0) {
        toast.error(
          `Cannot delete college: ${totalStudents} student(s) are still associated with this college. 
          Please delete or reassign all students first, then try again.`, 
          { duration: 5000 }
        );
        setDeleting(null);
        return;
      }
      
      // Use the server action to delete both the college document and the associated admin user
      if (adminId) {
        try {
          // This will delete both the Firestore document and the Firebase Auth user
          await deleteUser(adminId);
          console.log(`Admin user with ID ${adminId} deleted via server action`);
        } catch (adminDeleteError) {
          console.error("Error deleting admin user:", adminDeleteError);
          // Continue with college deletion even if admin deletion fails
        }
      }
      
      // Delete college from colleges collection if not deleted by the server action
      try {
        await deleteDoc(doc(db, "colleges", collegeId));
      } catch (collegeDeleteError) {
        // This might fail if the college was already deleted by the server action
        console.log("College may have been deleted by server action already");
      }
      
      // Update local state
      setColleges((prev) => prev.filter((c) => c.id !== collegeId));
      setFilteredColleges((prev) => prev.filter((c) => c.id !== collegeId));
      
      toast.success("College deleted successfully");
    } catch (error) {
      console.error("Error deleting college:", error);
      toast.error("Failed to delete college");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <AuthGuard requiredRole="admin">
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">College Management</h1>
          <Link href="/admin/user/college/new">
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add New College
            </Button>
          </Link>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search colleges or admins..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : filteredColleges.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {colleges.length === 0 
              ? "No colleges found. Add your first college using the button above."
              : "No colleges match your search criteria."}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>College Name</TableHead>
                  <TableHead>Admin Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredColleges.map((college) => (
                  <TableRow key={college.id}>
                    <TableCell className="font-medium">{college.name}</TableCell>
                    <TableCell>{college.adminName || "No admin"}</TableCell>
                    <TableCell>{college.adminEmail || "-"}</TableCell>
                    <TableCell>{college.adminPhone || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewCollege(college.id)}
                          title="View College Reports"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-destructive hover:text-destructive/90"
                              title="Delete College"
                            >
                              {deleting === college.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the college "{college.name}" and its admin user. 
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => handleDeleteCollege(college.id, college.adminId)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AuthGuard>
  );
} 