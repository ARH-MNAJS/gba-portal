"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChevronRight, Search } from "lucide-react";
import { serializeFirestoreData } from "@/lib/utils";
import { getCollegeNameById } from "@/lib/utils/colleges";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function AssessmentReportsTab() {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [collegeNames, setCollegeNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchAssessments = async () => {
      setLoading(true);
      try {
        const assessmentsRef = collection(db, "assessments");
        const querySnapshot = await getDocs(assessmentsRef);
        const assessmentsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Sort by createdAt in descending order
        assessmentsData.sort((a, b) => {
          return (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0);
        });

        setAssessments(assessmentsData);

        // Fetch college names for all unique collegeIds
        const uniqueCollegeIds = [...new Set(assessmentsData.map(a => a.collegeId).filter(Boolean))];
        const collegeNameMap: Record<string, string> = {};
        
        await Promise.all(uniqueCollegeIds.map(async (collegeId) => {
          if (collegeId === "all") {
            collegeNameMap[collegeId] = "All Colleges";
          } else {
            try {
              collegeNameMap[collegeId] = await getCollegeNameById(collegeId);
            } catch (error) {
              console.error(`Error fetching college name for ${collegeId}:`, error);
              collegeNameMap[collegeId] = collegeId; // Fallback to ID if name fetch fails
            }
          }
        }));
        
        setCollegeNames(collegeNameMap);
      } catch (error) {
        console.error("Error fetching assessments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssessments();
  }, []);

  const handleViewReport = (assessment: any) => {
    router.push(`/admin/reports/assessment/${assessment.id}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assessment Reports</CardTitle>
        <CardDescription>
          View reports for all assessments
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <Table>
            <TableCaption>List of all assessments</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>College</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assessments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No assessments found
                  </TableCell>
                </TableRow>
              ) : (
                assessments.map((assessment) => (
                  <TableRow key={assessment.id}>
                    <TableCell className="font-medium">
                      {assessment.name}
                    </TableCell>
                    <TableCell>
                      {assessment.collegeId ? 
                        collegeNames[assessment.collegeId] || "Loading..." : 
                        "N/A"}
                    </TableCell>
                    <TableCell>
                      {assessment.createdAt
                        ? format(
                            assessment.createdAt.toDate(),
                            "PPP"
                          )
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      {assessment.active ? "Active" : "Inactive"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewReport(assessment)}
                      >
                        View Report
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
} 