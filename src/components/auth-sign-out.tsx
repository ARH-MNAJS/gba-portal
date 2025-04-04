"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCallback } from "react";
import { auth } from "@/lib/firebase";
import { signOut as firebaseSignOut } from "firebase/auth";

/**
 * Centralized sign out handler that can be called from any component
 * to prevent code duplication across different sidebars and the header
 */
export const useSignOut = () => {
  const router = useRouter();
  
  // Use useCallback to memoize the function and prevent unnecessary re-renders
  const signOutHandler = useCallback(async (event?: Event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation(); // Prevent event bubbling
    }
    
    try {
      await firebaseSignOut(auth);
      toast.success('Signed out successfully');
      router.push('/');
      router.refresh();
    } catch (error) {
      toast.error('Error signing out. Please try again.');
    }
    
  }, [router]);

  return signOutHandler;
}; 