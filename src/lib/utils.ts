import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Serializes Firestore data to handle timestamps and other Firebase-specific data types
 */
export function serializeFirestoreData(data: any): any {
  if (!data) return data;
  
  // Handle different data types
  if (Array.isArray(data)) {
    return data.map(item => serializeFirestoreData(item));
  }
  
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  // Handle Firestore timestamp
  if (typeof data.toDate === 'function') {
    return data.toDate().toISOString();
  }
  
  // Handle Firestore timestamp that has been partially serialized
  if (data._seconds !== undefined && data._nanoseconds !== undefined) {
    return new Date(data._seconds * 1000).toISOString();
  }
  
  // Handle normal objects by recursively processing each property
  const serialized: Record<string, any> = {};
  Object.keys(data).forEach(key => {
    serialized[key] = serializeFirestoreData(data[key]);
  });
  
  return serialized;
}
