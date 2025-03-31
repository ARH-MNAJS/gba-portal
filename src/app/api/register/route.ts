import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { UserRole } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, role, name, phone } = body;
    
    // Basic validation
    if (!email || !password || !role || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    if (!['student', 'admin', 'college'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }
    
    // Check if user exists
    try {
      await adminAuth.getUserByEmail(email);
      // If we get here, the user already exists
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    } catch (error: any) {
      // If error is user-not-found, that's what we want (continue registration)
      if (error.code !== 'auth/user-not-found') {
        console.error('Error checking existing user:', error);
        return NextResponse.json(
          { error: 'Error checking existing user' },
          { status: 500 }
        );
      }
    }
    
    try {
      // Create the user in Firebase Auth
      const userRecord = await adminAuth.createUser({
        email,
        password,
        emailVerified: false,
      });
      
      const userId = userRecord.uid;
      const timestamp = new Date().toISOString();
      
      // Create user in the users collection
      await adminDb.collection('users').doc(userId).set({
        email: email.toLowerCase(),
        role,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      
      // Add role-specific data
      if (role === 'student') {
        const { college, branch, year } = body;
        
        if (!college || !branch || !year) {
          // Roll back user creation
          await adminAuth.deleteUser(userId);
          
          return NextResponse.json(
            { error: 'Missing required student fields' },
            { status: 400 }
          );
        }
        
        // Create student profile
        await adminDb.collection('students').doc(userId).set({
          name,
          email: email.toLowerCase(),
          phone: phone || '',
          college,
          branch,
          year,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      } else if (role === 'admin') {
        // Create admin profile
        await adminDb.collection('admins').doc(userId).set({
          name,
          email: email.toLowerCase(),
          phone: phone || '',
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      } else if (role === 'college') {
        const { college } = body;
        
        if (!college) {
          // Roll back user creation
          await adminAuth.deleteUser(userId);
          
          return NextResponse.json(
            { error: 'Missing required college fields' },
            { status: 400 }
          );
        }
        
        // Create college profile
        await adminDb.collection('colleges').doc(userId).set({
          name,
          email: email.toLowerCase(),
          phone: phone || '',
          college,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }
      
      return NextResponse.json({
        success: true,
        userId,
        message: 'Registration successful'
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      return NextResponse.json(
        { error: 'Registration failed', message: error.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 