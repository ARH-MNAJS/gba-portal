"use client";

import { useState, useEffect } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";

export default function PracticeReportsTab() {
  const [colleges, setColleges] = useState<any[]>([]);
  const [filteredColleges, setFilteredColleges] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchColleges = async () => {
      try {
        const collegesSnapshot = await getDocs(collection(db, "colleges"));
        const collegesList = await Promise.all(collegesSnapshot.docs.map(async (doc) => {
          const collegeData = serializeFirestoreData(doc.data());
          
          // Get college name
          let collegeName = collegeData.name || "Unknown College";
          
          // If there's a college field, try to get the name from that ID
          if (collegeData.college) {
            try {
              const fetchedName = await getCollegeNameById(collegeData.college);
              if (fetchedName !== collegeData.college) {
                collegeName = fetchedName;
              }
            } catch (error) {
              console.error(`Error fetching name for college ${collegeData.college}:`, error);
            }
          }
          
          return {
            id: doc.id,
            ...collegeData,
            properName: collegeName
          };
        }));
        
        setColleges(collegesList);
        setFilteredColleges(collegesList);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching colleges:", error);
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
      college.properName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      college.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      college.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredColleges(filtered);
  }, [searchTerm, colleges]);

  const handleCollegeClick = (collegeId: string) => {
    router.push(`/admin/reports/practice/${collegeId}`);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardFooter>
              <Skeleton className="h-4 w-4 ml-auto" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-4">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search colleges..."
          className="pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredColleges.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No colleges found
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredColleges.map((college) => (
            <Card 
              key={college.id} 
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => handleCollegeClick(college.id)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">
                  {college.properName || college.name || college.college || "Unnamed College"}
                </CardTitle>
                {college.email && (
                  <CardDescription>{college.email}</CardDescription>
                )}
              </CardHeader>
              <CardFooter className="justify-end">
                <ChevronRight className="h-4 w-4" />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 