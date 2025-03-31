import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
);

// Initialize Firebase Admin if it hasn't been initialized already
const apps = getApps();
const app = apps.length === 0
  ? initializeApp({
      credential: cert(serviceAccount),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    })
  : apps[0];

const adminAuth = getAuth(app);
const adminDb = getFirestore(app);

export { adminAuth, adminDb }; 