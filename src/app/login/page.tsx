"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useSession } from "@/providers/session-provider";

export default function LoginPage() {
  const { user, loading } = useSession();
  const router = useRouter();
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    // If user is authenticated, redirect to their dashboard
    if (!loading) {
      if (user) {
        router.push(`/${user.role}`);
      } else {
        // User not authenticated, show login options
        setPageLoading(false);
      }
    }
  }, [user, loading, router]);

  if (loading || pageLoading) {
    return (
      <div className="flex min-h-screen flex-col w-full">
        <Header />
        <main className="flex-1 w-full">
          <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col w-full">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Login</CardTitle>
              <CardDescription>
                Choose how you want to login to your account
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Button variant="outline" asChild>
                <Link href="/login/student" className="w-full">Student Login</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/login/admin-college" className="w-full">Admin / College Login</Link>
              </Button>
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground text-center w-full">
                Don&apos;t have an account? Contact your institution to get started.
              </p>
            </CardFooter>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
} 