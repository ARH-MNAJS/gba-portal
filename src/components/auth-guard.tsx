"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { UserRole } from "@/lib/auth-utils";
import { toast } from "sonner";
import { hasRoleAccess, getRoleRedirectPath, safeRedirect } from "@/lib/auth-utils";
import { useSession } from "@/providers/session-provider";

interface AuthGuardProps {
  children: ReactNode;
  requiredRole: UserRole;
  fallback?: ReactNode; // Optional loading component
}

/**
 * AuthGuard component to protect routes based on user roles
 * This can be reused across different dashboard pages
 */
export const AuthGuard = ({ children, requiredRole, fallback }: AuthGuardProps) => {
  const [authorized, setAuthorized] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const { user, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Create a single cleanup function for all timeouts
    const timeoutIds: NodeJS.Timeout[] = [];
    
    // Only check auth once the auth context has finished loading
    if (!loading) {
      // If user is authenticated but doesn't have the required role
      if (user && user.role && !hasRoleAccess(user.role, requiredRole)) {
        // Prevent state updates if component unmounts during this check
        const redirectTimeoutId = setTimeout(() => {
          toast.error(`You don't have access to the ${requiredRole} dashboard`);
          // Redirect to appropriate dashboard based on role
          safeRedirect(router, getRoleRedirectPath(user.role));
        }, 100);
        
        timeoutIds.push(redirectTimeoutId);
        return;
      }
      
      // If no user, redirect to login
      if (!user) {
        const loginTimeoutId = setTimeout(() => {
          toast.error("Please login to access your dashboard");
          safeRedirect(router, '/login');
        }, 100);
        
        timeoutIds.push(loginTimeoutId);
        return;
      }
      
      // User is authenticated and has the correct role
      // Slight delay to prevent UI flashing if there's a quick redirect
      const authorizeTimeoutId = setTimeout(() => {
        setAuthorized(true);
        setAuthChecked(true);
      }, 50);
      
      timeoutIds.push(authorizeTimeoutId);
    }
    
    // Cleanup all timeouts on unmount
    return () => {
      timeoutIds.forEach(id => clearTimeout(id));
    };
  }, [user, loading, router, requiredRole]);

  // Show loading or custom fallback component while checking auth
  if (!authChecked || loading || !authorized) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Checking authorization...</p>
      </div>
    );
  }

  // Render the protected content
  return <>{children}</>;
}; 