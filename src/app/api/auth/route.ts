import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import * as bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email, password, role } = await request.json();
    
    // Basic validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    try {
      // Check if user exists in Firebase Auth
      try {
        const userRecord = await adminAuth.getUserByEmail(email);
        
        // User exists, verify their role
        const userDoc = await adminDb.collection('users').doc(userRecord.uid).get();
        
        if (!userDoc.exists) {
          return NextResponse.json(
            { error: 'User profile not found' },
            { status: 404 }
          );
        }
        
        const userData = userDoc.data();
        
        // If role is specified and doesn't match, reject
        if (role && userData?.role !== role) {
          return NextResponse.json(
            { error: `Invalid credentials for ${role} access` },
            { status: 403 }
          );
        }
        
        // Return the user data (password verification will be done by the Firebase client SDK)
        return NextResponse.json({
          id: userRecord.uid,
          email: userData?.email,
          role: userData?.role,
        });
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          return NextResponse.json(
            { error: 'Invalid email or password' },
            { status: 401 }
          );
        }
        throw error;
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      return NextResponse.json(
        { error: 'Authentication failed' },
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

export async function PUT(request: NextRequest) {
  try {
    const { email, currentPassword, newPassword } = await request.json();
    
    // Basic validation
    if (!email || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Email, current password, and new password are required' },
        { status: 400 }
      );
    }
    
    try {
      // Get user by email
      const userRecord = await adminAuth.getUserByEmail(email);
      
      // Update the password
      await adminAuth.updateUser(userRecord.uid, {
        password: newPassword,
      });
      
      return NextResponse.json({
        success: true,
        message: 'Password updated successfully',
      });
    } catch (error: any) {
      console.error('Password update error:', error);
      return NextResponse.json(
        { error: 'Failed to update password' },
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