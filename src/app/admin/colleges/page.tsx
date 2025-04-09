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
import { Search, Plus, ChevronRight } from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { getAllColleges, type College } from "@/lib/utils/colleges";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function CollegesPage() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [filteredColleges, setFilteredColleges] = useState<College[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchColleges = async () => {
      setLoading(true);
      try {
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
      college.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredColleges(filtered);
  }, [searchTerm, colleges]);

  const handleCollegeClick = (collegeId: string) => {
    router.push(`/admin/colleges/${collegeId}`);
  };

  return (
    <AuthGuard requiredRole="admin">
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Colleges Management</h1>
          <Link href="/admin/colleges/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add New College
            </Button>
          </Link>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search colleges..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
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
        ) : filteredColleges.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {colleges.length === 0 
              ? "No colleges found. Add your first college using the button above."
              : "No colleges match your search criteria."}
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
                  <CardTitle className="text-lg">{college.name}</CardTitle>
                  <CardDescription>
                    {college.branches.length} branches, {college.years.length} years
                  </CardDescription>
                </CardHeader>
                <CardFooter className="justify-end">
                  <ChevronRight className="h-4 w-4" />
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  );
} 