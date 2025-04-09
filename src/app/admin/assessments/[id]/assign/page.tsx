"use client";

import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useSession } from "@/providers/session-provider";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  CheckCircle2,
  Search
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { db } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc 
} from "firebase/firestore";
import { serializeFirestoreData } from "@/lib/utils";

export default function AssignAssessmentPage({ params }: { params: { id: string } }) {
  const unwrappedParams = use(params);
  const assessmentId = unwrappedParams.id;
  const [assessment, setAssessment] = useState<any>(null);
  const [colleges, setColleges] = useState<any[]>([]);
  const [selectedColleges, setSelectedColleges] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filteredColleges, setFilteredColleges] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const { user } = useSession();
  const router = useRouter();

  // Load assessment and colleges
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load assessment
        const assessmentDoc = await getDoc(doc(db, "assessments", assessmentId));
        
        if (!assessmentDoc.exists()) {
          toast.error("Assessment not found");
          router.push("/admin/assessments");
          return;
        }
        
        const assessmentData = serializeFirestoreData({ 
          id: assessmentDoc.id, 
          ...assessmentDoc.data() 
        });
        
        setAssessment(assessmentData);
        setSelectedColleges(assessmentData.assignedTo || []);
        
        // Load colleges
        const collegesSnapshot = await getDocs(collection(db, "colleges"));
        const collegesList = collegesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...serializeFirestoreData(doc.data()),
        }));
        
        setColleges(collegesList);
        setFilteredColleges(collegesList);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Error loading data");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [assessmentId, router]);

  // Filter colleges when search term changes
  useEffect(() => {
    if (searchTerm) {
      const filtered = colleges.filter((college) => 
        college.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        college.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredColleges(filtered);
    } else {
      setFilteredColleges(colleges);
    }
  }, [searchTerm, colleges]);

  // Toggle college selection
  const toggleCollege = (collegeId: string) => {
    setSelectedColleges((prev) => {
      if (prev.includes(collegeId)) {
        return prev.filter((id) => id !== collegeId);
      } else {
        return [...prev, collegeId];
      }
    });
  };

  // Save assessment assignments
  const handleSave = async () => {
    if (!assessment) return;
    
    setSaving(true);
    try {
      await updateDoc(doc(db, "assessments", assessment.id), {
        assignedTo: selectedColleges,
      });
      
      toast.success("Assessment assigned successfully");
      router.push("/admin/assessments");
    } catch (error) {
      console.error("Error saving assignments:", error);
      toast.error("Error saving assignments");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Assign Assessment</h1>
        <Button variant="outline" onClick={() => router.push("/admin/assessments")}>
          Cancel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{assessment?.name}</CardTitle>
          <CardDescription>
            Select colleges to assign this assessment to
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search colleges..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="border rounded-md">
            <ScrollArea className="h-[400px]">
              {filteredColleges.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No colleges found
                </div>
              ) : (
                <div className="space-y-1 p-1">
                  {filteredColleges.map((college) => (
                    <div
                      key={college.id}
                      className="flex items-center space-x-2 rounded-md px-3 py-2 hover:bg-accent"
                    >
                      <Checkbox
                        id={`college-${college.id}`}
                        checked={selectedColleges.includes(college.id)}
                        onCheckedChange={() => toggleCollege(college.id)}
                      />
                      <Label
                        htmlFor={`college-${college.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="font-medium">
                          {college.name || college.college || "Unnamed College"}
                        </div>
                        {college.email && (
                          <div className="text-xs text-muted-foreground">
                            {college.email}
                          </div>
                        )}
                      </Label>
                      {selectedColleges.includes(college.id) && (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {selectedColleges.length} colleges selected
            </div>
            <div className="space-x-2">
              <Button
                variant="outline"
                onClick={() => setSelectedColleges([])}
                disabled={selectedColleges.length === 0}
              >
                Clear All
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedColleges(colleges.map(c => c.id))}
                disabled={selectedColleges.length === colleges.length}
              >
                Select All
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => router.push("/admin/assessments")}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Assignments"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 