"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  Timestamp,
  where,
  CollectionReference,
  DocumentData
} from "firebase/firestore";
import { AuthGuard } from "@/components/auth-guard";
import { getAllColleges } from "@/lib/utils/colleges";

interface Assessment {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  assignedTo: string[];
  games: Array<{ id: string; name: string; duration: number }>;
  createdAt: Timestamp;
}

export default function AssessmentsPage() {
  const router = useRouter();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredAssessments, setFilteredAssessments] = useState<Assessment[]>([]);
  const [collegeMap, setCollegeMap] = useState<Record<string, string>>({});

  // Fetch assessments from Firestore
  useEffect(() => {
    async function fetchAssessments() {
      try {
        setLoading(true);
        
        // Fetch all colleges to map IDs to names
        const colleges = await getAllColleges();
        const collegeMapping: Record<string, string> = {};
        colleges.forEach(college => {
          collegeMapping[college.id] = college.name;
        });
        setCollegeMap(collegeMapping);
        
        // Create query to get assessments
        const assessmentsCollection = collection(db, "assessments");
        const assessmentsQuery = query(
          assessmentsCollection,
          orderBy("createdAt", "desc")
        );
        
        // Execute query
        const querySnapshot = await getDocs(assessmentsQuery);
        
        if (querySnapshot.empty) {
          console.log("No assessments found");
          setAssessments([]);
        } else {
          // Process results
          const assessmentsData = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name || "Untitled Assessment",
              description: data.description || "",
              startDate: data.startDate || "",
              endDate: data.endDate || "",
              assignedTo: data.assignedTo || [],
              games: data.games || [],
              createdAt: data.createdAt,
            } as Assessment;
          });
          
          console.log("Fetched assessments:", assessmentsData.length);
          setAssessments(assessmentsData);
        }
      } catch (error) {
        console.error("Error fetching assessments:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAssessments();
  }, []);

  // Filter assessments based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredAssessments(assessments);
    } else {
      const filtered = assessments.filter((assessment) =>
        assessment.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredAssessments(filtered);
    }
  }, [searchTerm, assessments]);

  // Get college names for an assessment
  const getAssignedCollegeNames = (assignedIds: string[]) => {
    if (!assignedIds || assignedIds.length === 0) return "None";
    
    const collegeNames = assignedIds
      .map(id => collegeMap[id] || "Unknown")
      .filter(name => name !== "Unknown");
    
    if (collegeNames.length === 0) return "Unknown";
    if (collegeNames.length <= 2) return collegeNames.join(", ");
    return `${collegeNames.length} colleges`;
  };

  // Safely format date strings
  const formatDateSafely = (dateString: string | null | undefined) => {
    if (!dateString) return "Not set";
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }
      
      return format(date, "PPP p");
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Invalid date";
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-10 w-[150px]" />
        </div>
        <Skeleton className="h-[450px] w-full" />
      </div>
    );
  }

  return (
    <AuthGuard requiredRole="admin">
      <div className="w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Assessments</h1>
          <Button onClick={() => router.push("/admin/assessments/create")}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Assessment
          </Button>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assessments..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Assessments</CardTitle>
            <CardDescription>
              Manage your assessments and their assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredAssessments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? "No matching assessments found" : "No assessments created yet"}
                </p>
                {!searchTerm && (
                  <Button onClick={() => router.push("/admin/assessments/create")}>
                    Create Your First Assessment
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssessments.map((assessment) => (
                    <TableRow key={assessment.id}>
                      <TableCell className="font-medium">
                        {assessment.name}
                      </TableCell>
                      <TableCell>
                        {formatDateSafely(assessment.startDate)}
                      </TableCell>
                      <TableCell>
                        {formatDateSafely(assessment.endDate)}
                      </TableCell>
                      <TableCell>
                        {getAssignedCollegeNames(assessment.assignedTo)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/admin/assessments/${assessment.id}`)}
                          title="View Assessment Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
} 