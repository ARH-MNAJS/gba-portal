"use client";

import { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { auth } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { toast } from 'sonner';

export type UserRole = 'admin' | 'student' | 'college';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
  college?: string;
  branch?: string;
  year?: string;
}

/**
 * Handles authentication errors with appropriate user-friendly messages
 */
export const handleAuthError = (error: any): string => {
  if (!error) return '';

  // Network errors
  if (error.message?.includes('network') || error.code === 'auth/network-request-failed') {
    return "Connection error. Please check your internet and try again.";
  }

  // Auth specific errors
  if (error.code === 'auth/invalid-credential' || 
      error.code === 'auth/wrong-password' ||
      error.code === 'auth/user-not-found') {
    return "Invalid email or password. Please try again.";
  }

  // User disabled
  if (error.code === 'auth/user-disabled') {
    return "This account has been disabled. Please contact support.";
  }

  // Too many requests
  if (error.code === 'auth/too-many-requests') {
    return "Too many failed login attempts. Please try again later.";
  }

  // Default error message
  return error.message || "An error occurred. Please try again later.";
};

/**
 * Hook to require authentication
 * Returns the authenticated user and authentication status
 */
export const useRequireAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch additional user data from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as Omit<User, 'id'>;
            setUser({
              id: firebaseUser.uid,
              ...userData,
            });
          } else {
            console.error('User document does not exist in Firestore');
            setUser(null);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return {
    user,
    loading,
    isAuthenticated: !!user,
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
  
  const handleSignIn = async (email: string, password: string, role?: string) => {
    setIsLoading(true);
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Fetch user data to check role
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await firebaseSignOut(auth);
        toast.error('User profile not found');
        return { success: false, error: 'User profile not found' };
      }
      
      const userData = userDoc.data();
      
      // If role is specified, check if the user has the correct role
      if (role && userData.role !== role) {
        await firebaseSignOut(auth);
        toast.error(`You don't have ${role} access`);
        return { success: false, error: `You don't have ${role} access` };
      }
      
      toast.success('Signed in successfully');
      return { success: true, user: { ...userData, id: user.uid } };
    } catch (error: any) {
      const errorMessage = handleAuthError(error);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
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
      await firebaseSignOut(auth);
      toast.success('Signed out successfully');
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