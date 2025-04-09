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
        try {
          // First check if user is an admin
          const adminDoc = await getDoc(doc(db, 'admins', firebaseUser.uid));
          if (adminDoc.exists()) {
            const adminData = adminDoc.data();
            setUser({
              id: firebaseUser.uid,
              email: adminData.email || firebaseUser.email || '',
              role: 'admin',
              name: adminData.name || '',
            });
            setLoading(false);
            return;
          }
          
          // Then check if user is a student
          const studentDoc = await getDoc(doc(db, 'students', firebaseUser.uid));
          if (studentDoc.exists()) {
            const studentData = studentDoc.data();
            setUser({
              id: firebaseUser.uid,
              email: studentData.email || firebaseUser.email || '',
              role: 'student',
              name: studentData.name || '',
              college: studentData.college || '',
              branch: studentData.branch || '',
              year: studentData.year || '',
            });
            setLoading(false);
            return;
          }
          
          // Check if user is a college admin (by adminId)
          const collegeByIdQuery = query(
            collection(db, 'colleges'), 
            where('adminId', '==', firebaseUser.uid)
          );
          const collegeByIdSnapshot = await getDocs(collegeByIdQuery);
          
          if (!collegeByIdSnapshot.empty) {
            // College entry found with this user ID as admin
            const collegeDoc = collegeByIdSnapshot.docs[0];
            const collegeData = collegeDoc.data();
            
            setUser({
              id: firebaseUser.uid,
              email: collegeData.adminEmail || firebaseUser.email || '',
              role: 'admin', // Treat college admins as regular admins with limited scope
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
              
              setUser({
                id: firebaseUser.uid,
                email: firebaseUser.email,
                role: 'admin', // Treat college admins as regular admins with limited scope
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