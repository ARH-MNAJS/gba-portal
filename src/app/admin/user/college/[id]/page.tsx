"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface CollegeWithDetails {
  id: string;
  name: string;
  adminName?: string;
  adminEmail?: string;
  adminPhone?: string;
  adminId?: string;
  branches?: string[];
  years?: string[];
  year?: string[];
  createdAt?: string;
  students?: number;
}

export default function CollegeDetailsPage({ params }: { params: { id: string } }) {
  const [college, setCollege] = useState<CollegeWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { id: collegeId } = use(params);

  useEffect(() => {
    const fetchCollegeDetails = async () => {
      setLoading(true);
      try {
        // Get college details from Firestore
        const collegeDoc = await getDoc(doc(db, "colleges", collegeId));
        
        if (!collegeDoc.exists()) {
          toast.error("College not found");
          router.push("/admin/user/college");
          return;
        }
        
        const collegeData = collegeDoc.data() as CollegeWithDetails;
        setCollege({
          id: collegeDoc.id,
          ...collegeData
        });
      } catch (error) {
        console.error("Error fetching college details:", error);
        toast.error("Failed to load college details");
      } finally {
        setLoading(false);
      }
    };

    if (collegeId) {
      fetchCollegeDetails();
    }
  }, [collegeId, router]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not available';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderCollegeInfo = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      );
    }

    if (!college) return <p>No college data found.</p>;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">College Name</Label>
              <p className="text-lg font-medium">{college.name || 'Not specified'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Admin Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Admin Name</Label>
              <p className="text-lg font-medium">{college.adminName || 'Not specified'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="text-lg font-medium">{college.adminEmail || 'Not specified'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Phone</Label>
              <p className="text-lg font-medium">{college.adminPhone || 'Not specified'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Academic Programs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Branches</Label>
              <p className="text-lg font-medium">
                {college.branches && college.branches.length > 0 
                  ? college.branches.join(', ') 
                  : 'No branches configured'}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Years</Label>
              <p className="text-lg font-medium">
                {(college.years || college.year) && (college.years || college.year)!.length > 0 
                  ? (college.years || college.year)!.join(', ') 
                  : 'No years configured'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Account Created</Label>
              <p className="text-lg font-medium">{formatDate(college.createdAt)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <AuthGuard requiredRole="admin">
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">College Details</h1>
            {!loading && college && (
              <p className="text-muted-foreground">{college.name}</p>
            )}
          </div>
          <Button variant="outline" onClick={() => router.push('/admin/user/college')}>
            Back to Colleges
          </Button>
        </div>

        {renderCollegeInfo()}
      </div>
    </AuthGuard>
  );
} 