import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp,
  addDoc, 
  updateDoc,
  setDoc,
  Timestamp
} from 'firebase/firestore';
import { cache } from 'react';

export interface College {
  id: string;
  name: string;
  branches: string[];
  years: string[];
  adminName?: string;
  adminEmail?: string;
  adminPhone?: string;
  adminId?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Cache for college data to prevent excessive Firestore reads
let collegesCache: Record<string, { data: College; timestamp: number }> = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get a college by ID from Firestore
 */
export async function getCollegeById(collegeId: string): Promise<College> {
  // Validate collegeId
  if (!collegeId) {
    throw new Error("College ID is required");
  }
  
  console.log(`[getCollegeById] Getting college with ID: ${collegeId}`);
  
  // Check cache first
  const cachedCollege = collegesCache[collegeId];
  const now = Date.now();
  
  if (cachedCollege && now - cachedCollege.timestamp < CACHE_DURATION) {
    console.log(`[getCollegeById] Returning cached college: ${collegeId}`);
    return cachedCollege.data;
  }
  
  // Fetch from Firestore if not in cache or cache expired
  try {
    console.log(`[getCollegeById] Fetching from Firestore: ${collegeId}`);
    const collegeDoc = await getDoc(doc(db, "colleges", collegeId));
    
    if (collegeDoc.exists()) {
      const collegeData = collegeDoc.data() as College;
      
      // Update cache
      collegesCache[collegeId] = {
        data: { id: collegeId, ...collegeData },
        timestamp: now,
      };
      
      return { id: collegeId, ...collegeData };
    }
    
    // If document doesn't exist directly, try to find by query
    console.log(`[getCollegeById] College not found directly, trying query lookup`);
    
    // First try to query by field matching the ID
    const matchingQuery = query(
      collection(db, "colleges"), 
      where("collegeId", "==", collegeId)
    );
    let querySnapshot = await getDocs(matchingQuery);
    
    // If not found, try other ways to find it
    if (querySnapshot.empty) {
      // Try using the ID as a numeric field value
      const numericIdQuery = query(
        collection(db, "colleges"), 
        where("collegeId", "==", Number(collegeId))
      );
      querySnapshot = await getDocs(numericIdQuery);
      
      // If still not found, try looking for any field matching this ID
      if (querySnapshot.empty) {
        console.log(`[getCollegeById] No matching college found in queries`);
        throw new Error(`College with ID ${collegeId} not found`);
      }
    }
    
    // Found through query
    const foundDoc = querySnapshot.docs[0];
    const collegeData = foundDoc.data() as College;
    
    // Update cache with the found college
    collegesCache[collegeId] = {
      data: { id: foundDoc.id, ...collegeData },
      timestamp: now,
    };
    
    return { id: foundDoc.id, ...collegeData };
  } catch (error) {
    console.error(`[getCollegeById] Error fetching college:`, error);
    throw new Error(`College with ID ${collegeId} not found`);
  }
}

/**
 * Get all colleges from Firestore
 */
export const getAllColleges = cache(async (): Promise<College[]> => {
  const now = Date.now();
  let allCollegesNeedRefresh = true;
  
  // Check if we have all colleges in cache and it's still valid
  if (collegesCache['__all__']) {
    const allCollegesCache = collegesCache['__all__'];
    if (now - allCollegesCache.timestamp < CACHE_DURATION) {
      // Return cached colleges
      return (allCollegesCache.data as unknown) as College[];
    }
  }
  
  if (allCollegesNeedRefresh) {
    const collegesSnapshot = await getDocs(collection(db, "colleges"));
    const colleges = collegesSnapshot.docs.map((doc) => {
      const data = doc.data() as Omit<College, "id">;
      return { id: doc.id, ...data };
    });
    
    // Update individual college caches
    colleges.forEach((college) => {
      collegesCache[college.id] = {
        data: college,
        timestamp: now,
      };
    });
    
    // Update the all colleges cache
    collegesCache['__all__'] = {
      data: colleges as unknown as College,
      timestamp: now,
    };
    
    return colleges;
  }
  
  // This shouldn't be reached but TypeScript needs it
  return [];
});

/**
 * Get a college by admin ID
 */
export async function getCollegeByAdminId(adminId: string): Promise<College | null> {
  try {
    // Query colleges where adminId matches
    const collegesRef = collection(db, "colleges");
    const q = query(collegesRef, where("adminId", "==", adminId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    // Return the first matching college
    const collegeDoc = querySnapshot.docs[0];
    return { id: collegeDoc.id, ...collegeDoc.data() as College };
  } catch (error) {
    console.error("Error getting college by admin ID:", error);
    return null;
  }
}

/**
 * Get a college name by ID
 */
export async function getCollegeNameById(collegeId: string): Promise<string> {
  try {
    // Validate collegeId to avoid Firestore errors
    if (!collegeId || typeof collegeId !== 'string' || collegeId.trim() === '') {
      console.warn('[getCollegeNameById] Invalid collegeId provided:', collegeId);
      return 'Unknown College';
    }
    
    try {
      const college = await getCollegeById(collegeId);
      return college.name || 'Unknown College';
    } catch (error) {
      console.log(`[getCollegeNameById] Could not find college by ID, trying to fetch all colleges`);
      
      // If direct lookup fails, try to find in all colleges
      const allColleges = await getAllColleges();
      const college = allColleges.find(c => 
        c.id === collegeId || 
        c.collegeId === collegeId || 
        c.collegeId === Number(collegeId)
      );
      
      if (college) {
        return college.name;
      }
      
      console.warn(`[getCollegeNameById] College not found in any lookup method: ${collegeId}`);
      return collegeId || 'Unknown College';
    }
  } catch (error) {
    console.error('[getCollegeNameById] Error:', error);
    return collegeId || 'Unknown College'; // Fallback to ID if college not found
  }
}

/**
 * Create a new college
 */
export async function createCollege(
  collegeData: Omit<College, "id" | "createdAt" | "updatedAt">, 
  collegeId?: string
): Promise<string> {
  // Use provided ID or generate one from name
  const id = collegeId || collegeData.name.toLowerCase().replace(/\s+/g, "-");
  
  await setDoc(doc(db, "colleges", id), {
    ...collegeData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  // Clear the cache
  collegesCache = {};
  
  return id;
}

/**
 * Update an existing college
 */
export async function updateCollege(
  collegeId: string, 
  collegeData: Partial<Omit<College, "id" | "createdAt" | "updatedAt">>
): Promise<void> {
  await updateDoc(doc(db, "colleges", collegeId), {
    ...collegeData,
    updatedAt: serverTimestamp(),
  });
  
  // Clear the cache
  delete collegesCache[collegeId];
  delete collegesCache['__all__'];
} 