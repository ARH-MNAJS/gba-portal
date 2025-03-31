import { NextRequest, NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

// Environment variables
const setupKey = process.env.SETUP_SECRET_KEY || 'dev-setup-key'; // Add to .env.local

export async function POST(request: NextRequest) {
  try {
    const { key } = await request.json();
    
    // Verify setup key for security
    if (key !== setupKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Status tracking
    const results = {
      collections: {
        users: false,
        students: false,
        admins: false,
        colleges: false
      },
      admin: false,
      errors: [] as string[]
    };
    
    // Check if collections exist by querying them
    try {
      // Check users collection
      const usersSnapshot = await adminDb.collection('users').limit(1).get();
      results.collections.users = !usersSnapshot.empty;
      
      // Check students collection
      const studentsSnapshot = await adminDb.collection('students').limit(1).get();
      results.collections.students = !studentsSnapshot.empty;
      
      // Check admins collection
      const adminsSnapshot = await adminDb.collection('admins').limit(1).get();
      results.collections.admins = !adminsSnapshot.empty;
      
      // Check colleges collection
      const collegesSnapshot = await adminDb.collection('colleges').limit(1).get();
      results.collections.colleges = !collegesSnapshot.empty;
      
    } catch (error: any) {
      results.errors.push(`Error checking collections: ${error.message}`);
    }
    
    // Check if admin user exists
    try {
      try {
        const adminUserRecord = await adminAuth.getUserByEmail('admin@example.com');
        if (adminUserRecord) {
          // Check if admin profile exists in Firestore
          const adminDoc = await adminDb.collection('admins').doc(adminUserRecord.uid).get();
          results.admin = adminDoc.exists;
        }
      } catch (error: any) {
        // Admin user doesn't exist, create it
        if (error.code === 'auth/user-not-found') {
          // Create admin user
          const adminId = '00000000-0000-0000-0000-000000000000';
          const password = 'admin123';
          
          // Hash password (Firebase Auth will handle this, but we'll still hash it for our record)
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(password, salt);
          
          try {
            // Create user in Firebase Auth
            const userRecord = await adminAuth.createUser({
              uid: adminId,
              email: 'admin@example.com',
              password: password,
              emailVerified: true
            });
            
            // Create user profile in Firestore
            const timestamp = new Date().toISOString();
            
            // Add to users collection
            await adminDb.collection('users').doc(adminId).set({
              email: 'admin@example.com',
              role: 'admin',
              createdAt: timestamp,
              updatedAt: timestamp
            });
            
            // Add to admins collection
            await adminDb.collection('admins').doc(adminId).set({
              name: 'Admin User',
              email: 'admin@example.com',
              phone: '1234567890',
              createdAt: timestamp,
              updatedAt: timestamp
            });
            
            results.admin = true;
          } catch (createError: any) {
            results.errors.push(`Error creating admin user: ${createError.message}`);
          }
        } else {
          results.errors.push(`Error checking admin user: ${error.message}`);
        }
      }
    } catch (error: any) {
      results.errors.push(`Admin creation exception: ${error.message}`);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database check complete',
      results,
      note: "Firebase collections and admin user have been checked."
    });
  } catch (error: any) {
    console.error('Database setup error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
} 