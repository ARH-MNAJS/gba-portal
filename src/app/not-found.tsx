"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useState } from "react";

export default function NotFound() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isNavigating, setIsNavigating] = useState(false);

  // Go back properly, with navigation state tracking to prevent double clicks
  const handleGoBack = () => {
    if (isNavigating) return; // Prevent multiple clicks
    
    setIsNavigating(true);
    
    // Use history API directly to avoid Next.js router issues
    if (typeof window !== 'undefined' && window.history.length > 2) {
      window.history.back();
      
      // Reset state after a delay in case navigation fails
      setTimeout(() => {
        setIsNavigating(false);
      }, 1000);
    } else {
      // If no history, go to home or user dashboard
      if (session?.user) {
        toast.info("Returning to your dashboard");
        router.push(`/${session.user.role}`);
      } else {
        router.push('/');
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 w-full flex items-center justify-center">
        <div className="container flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold text-center mb-4">404</h1>
          <div className="text-center">
            <h2 className="mt-4 text-2xl font-bold">Page Not Found</h2>
            <p className="mt-2 text-muted-foreground">
              Sorry, we couldn't find the page you're looking for.
            </p>
            <div className="mt-6 flex items-center justify-center gap-4">
              <Button asChild>
                <Link href="/">Go Home</Link>
              </Button>
              <Button variant="outline" onClick={handleGoBack} disabled={isNavigating}>
                {isNavigating ? "Going back..." : "Go Back"}
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
} 