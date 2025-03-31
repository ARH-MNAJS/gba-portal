"use client";

import { useState, useEffect } from 'react';
import { UserRole, getSupabaseClient } from './supabase';
import { toast } from 'sonner';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

/**
 * Handles authentication errors with appropriate user-friendly messages
 */
export const handleAuthError = (error: any): string => {
  if (!error) return '';

  // Network errors
  if (error.message?.includes('network') || error.code === 'NETWORK_ERROR') {
    return "Connection error. Please check your internet and try again.";
  }

  // Auth specific errors
  if (error.message?.includes('Invalid login credentials') || 
      error.message?.includes('Invalid email or password') ||
      error.code === 'INVALID_LOGIN_CREDENTIALS') {
    return "Invalid email or password. Please try again.";
  }

  // Session expired
  if (error.message?.includes('session') || error.code === 'EXPIRED_SESSION') {
    return "Your session has expired. Please login again.";
  }

  // Default error message
  return error.message || "An error occurred. Please try again later.";
};

/**
 * Hook to require authentication
 * Returns the authenticated user and authentication status
 */
export const useRequireAuth = () => {
  const { data: session, status } = useSession();
  const loading = status === 'loading';
  const isAuthenticated = status === 'authenticated';
  
  // Create a client with the session token if available
  const supabaseClient = session?.supabaseAccessToken 
    ? getSupabaseClient(session.supabaseAccessToken)
    : null;

  return {
    user: session?.user,
    loading,
    isAuthenticated,
    supabaseClient
  };
};

/**
 * Safely redirect to a path, handling path validation
 */
export const safeRedirect = (router: AppRouterInstance, path: string) => {
  const safePath = /^\/[\w\-\/]*$/.test(path) ? path : '/';
  router.push(safePath);
};

/**
 * Get the appropriate redirect path for a user role
 */
export const getRoleRedirectPath = (role: UserRole): string => {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'student':
      return '/student';
    case 'college':
      return '/college';
    default:
      return '/login';
  }
};

/**
 * Check if a user role has access to a required role's pages
 */
export const hasRoleAccess = (userRole: UserRole, requiredRole: UserRole): boolean => {
  // Admin has access to all roles
  if (userRole === 'admin') return true;
  
  // Other roles only have access to their own dashboards
  return userRole === requiredRole;
};

/**
 * Hook to handle sign-in functionality
 */
export const useAuthSignIn = () => {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSignIn = async (email: string, password: string, callbackUrl?: string) => {
    setIsLoading(true);
    
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      
      if (result?.error) {
        toast.error(result.error);
        return { success: false, error: result.error };
      }
      
      toast.success('Signed in successfully');
      return { success: true };
    } catch (error: any) {
      toast.error('Authentication failed. Please try again.');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };
  
  return { handleSignIn, isLoading };
};

/**
 * Hook to handle sign-out functionality
 */
export const useAuthSignOut = () => {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSignOut = async () => {
    setIsLoading(true);
    
    try {
      await signOut({ redirect: false });
      return { success: true };
    } catch (error: any) {
      toast.error("Error signing out. Please try again.");
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };
  
  return { handleSignOut, isLoading };
}; 