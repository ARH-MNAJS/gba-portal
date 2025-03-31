"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";

export default function AdminUserPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to students page by default
    router.push("/admin/user/students");
  }, [router]);

  return (
    <AuthGuard requiredRole="admin">
      <div className="container mx-auto py-6">
        <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Redirecting to user management...</p>
        </div>
      </div>
    </AuthGuard>
  );
} 