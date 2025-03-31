"use client";

import { useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, limit, query } from "firebase/firestore";

export function DatabaseInitializer() {
  useEffect(() => {
    // Only run in development environment
    if (process.env.NODE_ENV === 'development') {
      // Check if collections exist in Firebase
      const checkFirebaseSetup = async () => {
        try {
          // Check users collection
          const usersQuery = query(collection(db, 'users'), limit(1));
          const usersSnapshot = await getDocs(usersQuery);
          
          if (usersSnapshot.empty) {
            console.log('Users collection is empty or does not exist. Please run setup from the /api/db-setup page.');
          } else {
            console.log('Firebase collections initialized.');
          }
        } catch (error) {
          console.error('Error checking Firebase setup:', error);
        }
      };
      
      checkFirebaseSetup().catch(console.error);
    }
  }, []);

  // This component doesn't render anything
  return null;
} 