"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc, 
  getDoc 
} from "firebase/firestore";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, Search } from "lucide-react";
import { serializeFirestoreData } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { use } from "react";

export default function CollegeAssessmentsReportsPage({ params }: { params: { collegeId: string } }) {
  // Unwrap params using React.use()
  const unwrappedParams = use(params);
  const collegeId = unwrappedParams.collegeId;

  const [college, setCollege] = useState<any>(null);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [filteredAssessments, setFilteredAssessments] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch college data
        const collegeDoc = await getDoc(doc(db, "colleges", collegeId));
        if (!collegeDoc.exists()) {
          router.push("/admin/reports");
          return;
        }
        
        const collegeData = {
          id: collegeDoc.id,
          ...serializeFirestoreData(collegeDoc.data())
        };
        setCollege(collegeData);
        
        // Fetch assessments assigned to this college
        const assessmentsQuery = query(
          collection(db, "assessments"),
          where("assignedTo", "array-contains", collegeId)
        );
        
        const assessmentsSnapshot = await getDocs(assessmentsQuery);
        const assessmentsList = assessmentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...serializeFirestoreData(doc.data())
        }));
        
        setAssessments(assessmentsList);
        setFilteredAssessments(assessmentsList);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [collegeId, router]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredAssessments(assessments);
      return;
    }

    const filtered = assessments.filter((assessment) =>
      assessment.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredAssessments(filtered);
  }, [searchTerm, assessments]);

  const handleViewReport = (assessmentId: string) => {
    router.push(`/admin/reports/assessments/${collegeId}/${assessmentId}`);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "MMM dd, yyyy hh:mm a");
    } catch (error) {
      return "Invalid date";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/admin/reports")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">
            {college?.name || college?.college || "College"} - Assessments
          </h1>
        </div>
      </div>

      <div className="relative">
        <div className="flex w-full max-w-md items-center space-x-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search assessments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
        </div>
      </div>

      {filteredAssessments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No assessments found for this college
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assessment Name</TableHead>
                <TableHead>Start Date & Time</TableHead>
                <TableHead>End Date & Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssessments.map((assessment) => (
                <TableRow key={assessment.id}>
                  <TableCell className="font-medium">{assessment.name}</TableCell>
                  <TableCell>{formatDate(assessment.startDate)}</TableCell>
                  <TableCell>{formatDate(assessment.endDate)}</TableCell>
                  <TableCell>{assessment.duration} min</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewReport(assessment.id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Report
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
} 