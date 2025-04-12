"use client";

import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "@/lib/auth-utils";

// Create a context for the user session
type SessionContextType = {
  user: User | null;
  loading: boolean;
};

const SessionContext = createContext<SessionContextType>({
  user: null,
  loading: true
});

export const useSession = () => useContext(SessionContext);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Try to fetch user from collections
        try {
          // First check the users collection (unified collection)
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log("Found user in users collection:", userData);
            
            // If this is a student, ensure we have college ID
            if (userData.role === 'student') {
              let collegeId = userData.college || '';
              
              // If college ID is missing and student has collegeId
              if (!collegeId && userData.collegeId) {
                collegeId = userData.collegeId;
              }
              
              setUser({
                id: firebaseUser.uid,
                email: userData.email || firebaseUser.email || '',
                role: 'student',
                name: userData.name || '',
                college: collegeId,
                branch: userData.branch || '',
                year: userData.year || ''
              });
              
              // Log for debugging
              console.log("Setting student user with college:", collegeId);
              setLoading(false);
              return;
            }
            
            // If this is a college admin
            if (userData.role === 'college') {
              setUser({
                id: firebaseUser.uid,
                email: userData.email || firebaseUser.email || '',
                role: 'college',
                name: userData.name || '',
                college: userData.college || ''
              });
              setLoading(false);
              return;
            }
            
            // For admin or other roles
            setUser({
              id: firebaseUser.uid,
              email: userData.email || firebaseUser.email || '',
              role: userData.role || 'admin',
              name: userData.name || ''
            });
            setLoading(false);
            return;
          }
          
          // Check students collection as fallback
          const studentDoc = await getDoc(doc(db, 'students', firebaseUser.uid));
          if (studentDoc.exists()) {
            const studentData = studentDoc.data();
            console.log("Found user in students collection:", studentData);
            
            let collegeId = studentData.college || '';
            
            // If college ID is missing and student has collegeId
            if (!collegeId && studentData.collegeId) {
              collegeId = studentData.collegeId;
            }
            
            setUser({
              id: firebaseUser.uid,
              email: studentData.email || firebaseUser.email || '',
              role: 'student',
              name: studentData.name || '',
              college: collegeId,
              branch: studentData.branch || '',
              year: studentData.year || ''
            });
            setLoading(false);
            return;
          }
          
          // Check admins collection
          const adminDoc = await getDoc(doc(db, 'admins', firebaseUser.uid));
          if (adminDoc.exists()) {
            const adminData = adminDoc.data();
            console.log("Found user in admins collection:", adminData);
            
            setUser({
              id: firebaseUser.uid,
              email: adminData.email || firebaseUser.email || '',
              role: 'admin',
              name: adminData.name || ''
            });
            setLoading(false);
            return;
          }
          
          // Check for college admin by adminId field
          // Query colleges collection where adminId matches the user's uid
          const collegeByIdQuery = query(
            collection(db, 'colleges'),
            where('adminId', '==', firebaseUser.uid)
          );
          const collegeByIdSnapshot = await getDocs(collegeByIdQuery);
          
          if (!collegeByIdSnapshot.empty) {
            // College entry found with this user ID as admin
            const collegeDoc = collegeByIdSnapshot.docs[0];
            const collegeData = collegeDoc.data();
            console.log("Found college with matching adminId:", collegeData);
            
            setUser({
              id: firebaseUser.uid,
              email: collegeData.adminEmail || firebaseUser.email || '',
              role: 'college', // Use proper college role instead of admin
              name: collegeData.adminName || '',
              college: collegeDoc.id // Store the college ID for reference
            });
            setLoading(false);
            return;
          }
          
          // Last check: try to find college by admin email
          if (firebaseUser.email) {
            const collegeByEmailQuery = query(
              collection(db, 'colleges'),
              where('adminEmail', '==', firebaseUser.email)
            );
            const collegeByEmailSnapshot = await getDocs(collegeByEmailQuery);
            
            if (!collegeByEmailSnapshot.empty) {
              // College entry found with this email as admin
              const collegeDoc = collegeByEmailSnapshot.docs[0];
              const collegeData = collegeDoc.data();
              console.log("Found college with matching adminEmail:", collegeData);
              
              setUser({
                id: firebaseUser.uid,
                email: firebaseUser.email,
                role: 'college', // Use proper college role instead of admin
                name: collegeData.adminName || '',
                college: collegeDoc.id // Store the college ID for reference
              });
              setLoading(false);
              return;
            }
          }
          
          // If we reach here, no valid user record was found
          console.warn('No valid user record found in any collection');
          setUser(null);
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

  return (
    <SessionContext.Provider value={{ user, loading }}>
      {children}
    </SessionContext.Provider>
  );
} 