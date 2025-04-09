import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK
let firebaseAdminConfig;

// Check if we have a service account key JSON in environment variables
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    // If we have the full JSON as an environment variable, use it
    firebaseAdminConfig = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    console.log('Using FIREBASE_SERVICE_ACCOUNT_KEY from environment variables');
  } catch (error) {
    console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:', error);
    throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY format');
  }
} else {
  // Otherwise, construct from individual environment variables
  if (!process.env.FIREBASE_PRIVATE_KEY) {
    console.error('FIREBASE_PRIVATE_KEY not found in environment variables');
    throw new Error('FIREBASE_PRIVATE_KEY environment variable is required');
  }
  
  firebaseAdminConfig = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // Make sure to properly format the private key by replacing escaped newlines
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };
  console.log('Using individual Firebase credential environment variables');
}

let app;

try {
  // Check if Firebase Admin has already been initialized
  if (getApps().length === 0) {
    console.log('Initializing Firebase Admin SDK');
    app = initializeApp({
      credential: cert(firebaseAdminConfig),
    });
  } else {
    console.log('Firebase Admin SDK already initialized');
    app = getApp();
  }
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
  throw new Error('Failed to initialize Firebase Admin SDK');
}

// Export admin services
export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);

console.log('Firebase Admin SDK initialized successfully');

/**
 * Helper function to serialize Firestore data for server-client communication
 * This guarantees that all Firestore-specific objects like timestamps are converted
 * to standard serializable formats before passing from server to client components
 */
export const serializeFirestoreData = (data: any): any => {
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
}; 