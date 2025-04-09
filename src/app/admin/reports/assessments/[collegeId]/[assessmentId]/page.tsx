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
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Eye } from "lucide-react";
import { serializeFirestoreData } from "@/lib/utils";
import { PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip } from "recharts";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { format } from "date-fns";
import { use } from "react";

// In a real application, you would use a library like xlsx or csv
const exportToCSV = (data: any[], filename: string) => {
  // Convert data to CSV format
  const headers = Object.keys(data[0] || {}).join(',');
  const rows = data.map(item => 
    Object.values(item).map(value => 
      typeof value === 'string' && value.includes(',') 
        ? `"${value}"` 
        : String(value)
    ).join(',')
  ).join('\n');
  
  const csvContent = `${headers}\n${rows}`;
  
  // Create a blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function AssessmentReportPage({ 
  params 
}: { 
  params: { collegeId: string; assessmentId: string } 
}) {
  // Unwrap params using React.use()
  const unwrappedParams = use(params);
  const collegeId = unwrappedParams.collegeId;
  const assessmentId = unwrappedParams.assessmentId;

  const [college, setCollege] = useState<any>(null);
  const [assessment, setAssessment] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pieChartData, setPieChartData] = useState<any[]>([]);
  const [barChartData, setBarChartData] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch college data
        const collegeDoc = await getDoc(doc(db, "colleges", collegeId));
        if (!collegeDoc.exists()) {
          router.push(`/admin/reports/assessments/${collegeId}`);
          return;
        }
        
        const collegeData = {
          id: collegeDoc.id,
          ...serializeFirestoreData(collegeDoc.data())
        };
        setCollege(collegeData);
        
        // Fetch assessment data
        const assessmentDoc = await getDoc(doc(db, "assessments", assessmentId));
        if (!assessmentDoc.exists()) {
          router.push(`/admin/reports/assessments/${collegeId}`);
          return;
        }
        
        const assessmentData = {
          id: assessmentDoc.id,
          ...serializeFirestoreData(assessmentDoc.data())
        };
        setAssessment(assessmentData);
        
        // Fetch students in this college
        const studentsQuery = query(
          collection(db, "students"),
          where("collegeId", "==", collegeId)
        );
        
        const studentsSnapshot = await getDocs(studentsQuery);
        const studentsList = studentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...serializeFirestoreData(doc.data())
        }));
        
        // Fetch assessment attempts for this assessment
        const attemptsQuery = query(
          collection(db, "assessmentAttempts"),
          where("assessmentId", "==", assessmentId)
        );
        
        const attemptsSnapshot = await getDocs(attemptsQuery);
        const attemptsList = attemptsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...serializeFirestoreData(doc.data())
        }));
        
        // Match attempts with students and enrich data
        const enrichedStudents = studentsList.map(student => {
          const attempt = attemptsList.find(a => a.studentId === student.id);
          return {
            ...student,
            attempt: attempt || null
          };
        });
        
        // Filter to only students with attempts for table
        const studentsWithAttempts = enrichedStudents.filter(student => student.attempt);
        setStudents(enrichedStudents);
        setAttempts(attemptsList);
        
        // Create pie chart data
        const pieData = [
          { name: 'Attempted', value: studentsWithAttempts.length, color: '#3498db' },
          { name: 'Not Attempted', value: studentsList.length - studentsWithAttempts.length, color: '#e74c3c' }
        ];
        setPieChartData(pieData);
        
        // Create bar chart data for score ranges
        const scoreRanges = [
          { range: '0-10', count: 0 },
          { range: '11-20', count: 0 },
          { range: '21-30', count: 0 },
          { range: '31-40', count: 0 },
          { range: '41-50', count: 0 },
          { range: '51-60', count: 0 },
          { range: '61-70', count: 0 },
          { range: '71-80', count: 0 },
          { range: '81-90', count: 0 },
          { range: '91-100', count: 0 }
        ];
        
        studentsWithAttempts.forEach(student => {
          const score = student.attempt.totalScore || 0;
          const rangeIndex = Math.min(Math.floor(score / 10), 9);
          scoreRanges[rangeIndex].count++;
        });
        
        setBarChartData(scoreRanges);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [collegeId, assessmentId, router]);

  const handleViewStudentReport = (studentId: string) => {
    router.push(`/admin/reports/assessments/${collegeId}/${assessmentId}/student/${studentId}`);
  };

  const handleExport = () => {
    if (students.length === 0) return;
    
    const studentsWithAttempts = students.filter(student => student.attempt);
    const exportData = studentsWithAttempts.map(student => ({
      Name: student.firstName + ' ' + student.lastName,
      Email: student.email,
      Phone: student.phone || 'N/A',
      Score: student.attempt?.totalScore || 0,
      "Completion Time": student.attempt?.completedAt ? format(new Date(student.attempt.completedAt), 'yyyy-MM-dd HH:mm') : 'Not completed'
    }));
    
    exportToCSV(exportData, `${college?.name || 'College'}-${assessment?.name || 'Assessment'}-Report`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Calculate average score
  const studentsWithAttempts = students.filter(student => student.attempt);
  const averageScore = studentsWithAttempts.length > 0
    ? studentsWithAttempts.reduce((acc, student) => acc + (student.attempt?.totalScore || 0), 0) / studentsWithAttempts.length
    : 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push(`/admin/reports/assessments/${collegeId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">
            {assessment?.name} - Assessment Report
          </h1>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assessment Details</CardTitle>
          <CardDescription>
            Information about this assessment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium">Assessment Name</p>
              <p>{assessment?.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Duration</p>
              <p>{assessment?.duration} minutes</p>
            </div>
            <div>
              <p className="text-sm font-medium">Date Range</p>
              <p>
                {assessment?.startDate && assessment?.endDate
                  ? `${format(new Date(assessment.startDate), "MMM dd, yyyy")} - ${format(new Date(assessment.endDate), "MMM dd, yyyy")}`
                  : "Not specified"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Student Participation</CardTitle>
            <CardDescription>
              Showing students who have taken this assessment
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Score Distribution</CardTitle>
            <CardDescription>
              Student scores grouped by range (Average: {averageScore.toFixed(2)})
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" name="Students" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Results</CardTitle>
          <CardDescription>
            Showing all students who have taken this assessment
          </CardDescription>
        </CardHeader>
        <CardContent>
          {students.filter(student => student.attempt).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No students have attempted this assessment yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Completion Time</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students
                  .filter(student => student.attempt)
                  .sort((a, b) => (b.attempt?.totalScore || 0) - (a.attempt?.totalScore || 0))
                  .map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {student.firstName} {student.lastName}
                      </TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>{student.phone || "N/A"}</TableCell>
                      <TableCell>
                        <div className="font-medium">{student.attempt?.totalScore || 0}/100</div>
                      </TableCell>
                      <TableCell>
                        {student.attempt?.completedAt 
                          ? format(new Date(student.attempt.completedAt), "MMM dd, yyyy hh:mm a")
                          : "Not completed"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewStudentReport(student.id)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Report
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
  );
} 