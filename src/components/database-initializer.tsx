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
          // Check students collection (we don't use users collection anymore)
          const studentsQuery = query(collection(db, 'students'), limit(1));
          const studentsSnapshot = await getDocs(studentsQuery);
          
          // Check colleges collection
          const collegesQuery = query(collection(db, 'colleges'), limit(1));
          const collegesSnapshot = await getDocs(collegesQuery);
          
          if (studentsSnapshot.empty && collegesSnapshot.empty) {
            console.log('Students and colleges collections are empty or do not exist. Please run setup from the /api/db-setup page.');
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