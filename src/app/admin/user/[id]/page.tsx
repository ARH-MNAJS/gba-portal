"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { fetchUserById } from "@/lib/actions/user-actions";
import { getCollegeNameById } from "@/lib/utils/colleges";

interface UserDetails {
  id: string;
  name: string;
  email: string;
  phone: string;
  college: string;
  branch: string;
  year: string;
  role: string;
  created_at?: string;
  last_sign_in_at?: string;
}

export default function UserDetailsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [collegeName, setCollegeName] = useState<string>('');
  
  useEffect(() => {
    // Get user ID from URL path
    const path = window.location.pathname;
    const userId = path.split('/').pop() || '';
    
    loadUserDetails(userId);
  }, []);
  
  const loadUserDetails = async (userId: string) => {
    try {
      setLoading(true);
      
      // Call the server action to fetch user details
      const userDetails = await fetchUserById(userId);
      setUser(userDetails as UserDetails);
      
      // If the user has a college, get its name
      if (userDetails?.college) {
        try {
          const name = await getCollegeNameById(userDetails.college);
          setCollegeName(name);
        } catch (error) {
          console.error("Error fetching college name:", error);
          setCollegeName(userDetails.college);
        }
      }
    } catch (error: any) {
      console.error('Error fetching user details:', error);
      toast.error(error.message || 'Failed to fetch user details');
      router.push('/admin/user');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderUserInfo = () => {
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

    if (!user) return <p>No user data found.</p>;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Name</Label>
              <p className="text-lg font-medium">{user.name || 'Not specified'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="text-lg font-medium">{user.email}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Phone</Label>
              <p className="text-lg font-medium">{user.phone || 'Not specified'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">User Type</Label>
              <p className="text-lg font-medium capitalize">{user.role}</p>
            </div>
          </CardContent>
        </Card>

        {user.role === 'student' && (
          <Card>
            <CardHeader>
              <CardTitle>Academic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">College</Label>
                <p className="text-lg font-medium">{collegeName || user.college}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Branch</Label>
                <p className="text-lg font-medium">{user.branch}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Year</Label>
                <p className="text-lg font-medium">{user.year}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Account Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Account Created</Label>
              <p className="text-lg font-medium">{formatDate(user.created_at)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Last Sign In</Label>
              <p className="text-lg font-medium">{formatDate(user.last_sign_in_at)}</p>
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
            <h1 className="text-2xl font-bold">User Details</h1>
            {!loading && user && (
              <p className="text-muted-foreground">{user.name} ({user.email})</p>
            )}
          </div>
          <Button variant="outline" onClick={() => router.push('/admin/user')}>
            Back to Users
          </Button>
        </div>

        {renderUserInfo()}
      </div>
    </AuthGuard>
  );
} 