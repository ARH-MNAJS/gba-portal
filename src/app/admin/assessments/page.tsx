"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Edit, Trash, Users } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { useSession } from "@/providers/session-provider";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  query,
  where,
  getDocs,
  deleteDoc,
  serverTimestamp,
  addDoc
} from "firebase/firestore";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { serializeFirestoreData } from "@/lib/utils";

export default function AdminAssessmentsPage() {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [assessments, setAssessments] = useState<any[]>([]);
  const [filteredAssessments, setFilteredAssessments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const { user } = useSession();
  const router = useRouter();

  // Load assessments
  useEffect(() => {
    const loadAssessments = async () => {
      if (!user?.id) return;

      setIsLoading(true);
      try {
        // Get all assessments created by this admin
        const assessmentsRef = collection(db, "assessments");
        const assessmentsQuery = query(
          assessmentsRef,
          where("createdBy", "==", user.id)
        );
        const assessmentsSnapshot = await getDocs(assessmentsQuery);
        
        // Process assessments
        const now = new Date();
        const assessmentList = assessmentsSnapshot.docs.map((doc) => {
          const assessment = serializeFirestoreData({ id: doc.id, ...doc.data() });
          
          // Calculate assessment status
          const startDate = new Date(assessment.startDate);
          const endDate = new Date(assessment.endDate);
          const hasStarted = now >= startDate;
          const hasEnded = now > endDate;
          
          return {
            ...assessment,
            status: hasEnded 
              ? "completed" 
              : hasStarted 
                ? "active" 
                : "upcoming",
          };
        });
        
        setAssessments(assessmentList);
        setFilteredAssessments(assessmentList);
      } catch (error) {
        console.error("Error loading assessments:", error);
        toast.error("Failed to load assessments");
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

  // Handle creating a new assessment
  const handleCreateAssessment = () => {
    router.push(`/admin/assessments/create`);
  };

  // Handle editing an assessment
  const handleEditAssessment = (assessmentId: string) => {
    router.push(`/admin/assessments/${assessmentId}/edit`);
  };

  // Handle assigning an assessment to colleges/users
  const handleAssignAssessment = (assessmentId: string) => {
    router.push(`/admin/assessments/${assessmentId}/assign`);
  };

  // Handle deleting an assessment
  const handleDeleteAssessment = async (assessmentId: string) => {
    try {
      // Delete the assessment
      await deleteDoc(doc(db, "assessments", assessmentId));
      
      // Update the local state
      const updatedAssessments = assessments.filter(a => a.id !== assessmentId);
      setAssessments(updatedAssessments);
      setFilteredAssessments(updatedAssessments);
      
      toast.success("Assessment deleted successfully");
    } catch (error) {
      console.error("Error deleting assessment:", error);
      toast.error("Failed to delete assessment");
    }
    
    setConfirmDelete(null);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Assessments</h1>
        <div className="flex gap-4">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assessments..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={handleCreateAssessment}>
            <Plus className="h-4 w-4 mr-2" />
            Create Assessment
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : filteredAssessments.length === 0 ? (
        <div className="bg-background border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">No Assessments Found</p>
          <Button onClick={handleCreateAssessment} className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Assessment
          </Button>
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
                <TableHead>Status</TableHead>
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
                    <div className={`px-2 py-1 rounded-full text-xs font-medium inline-block ${
                      assessment.status === "completed" 
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                        : assessment.status === "active"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    }`}>
                      {assessment.status === "completed" 
                        ? "Completed" 
                        : assessment.status === "active" 
                          ? "Active" 
                          : "Upcoming"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => handleEditAssessment(assessment.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => handleAssignAssessment(assessment.id)}
                      >
                        <Users className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => setConfirmDelete(assessment.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this assessment and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && handleDeleteAssessment(confirmDelete)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 