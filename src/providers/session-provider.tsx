"use client";

import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
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
        // Fetch additional user data from Firestore
        try {
          // First get the basic user data
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as Omit<User, 'id'>;
            let userInfo: any = {
              id: firebaseUser.uid,
              ...userData,
              email: userData.email || firebaseUser.email || '',
            };
            
            // Now fetch role-specific data (student, admin, or college)
            if (userData.role === 'student') {
              const studentDoc = await getDoc(doc(db, 'students', firebaseUser.uid));
              if (studentDoc.exists()) {
                const studentData = studentDoc.data();
                userInfo = {
                  ...userInfo,
                  name: studentData.name || '',
                  college: studentData.college || '', // This is the important field for students
                  branch: studentData.branch || '',
                  year: studentData.year || '',
                };
              }
            } else if (userData.role === 'admin') {
              const adminDoc = await getDoc(doc(db, 'admins', firebaseUser.uid));
              if (adminDoc.exists()) {
                const adminData = adminDoc.data();
                userInfo = {
                  ...userInfo,
                  name: adminData.name || '',
                };
              }
            } else if (userData.role === 'college') {
              const collegeDoc = await getDoc(doc(db, 'colleges', firebaseUser.uid));
              if (collegeDoc.exists()) {
                const collegeData = collegeDoc.data();
                userInfo = {
                  ...userInfo,
                  name: collegeData.name || '',
                  college: collegeData.college || '', // This is the important field for college admins
                };
              }
            }
            
            setUser(userInfo);
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

  return (
    <SessionContext.Provider value={{ user, loading }}>
      {children}
    </SessionContext.Provider>
  );
} 