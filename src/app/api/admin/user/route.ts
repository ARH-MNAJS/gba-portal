import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@/lib/auth-utils';

// Ensure only admins can access this route
async function validateAdmin(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        valid: false,
        error: 'Unauthorized - Missing or invalid auth header'
      };
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    if (!decodedToken) {
      return {
        valid: false,
        error: 'Unauthorized - Invalid token'
      };
    }
    
    // Check user role in Firestore
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      return {
        valid: false,
        error: 'Unauthorized - User not found'
      };
    }
    
    const userData = userDoc.data();
    if (userData?.role !== 'admin') {
      return {
        valid: false,
        error: 'Unauthorized - Insufficient permissions'
      };
    }
    
    return {
      valid: true,
      userId: decodedToken.uid
    };
  } catch (error) {
    console.error('Error validating admin access:', error);
    return {
      valid: false,
      error: 'Unauthorized - Authentication failed'
    };
  }
}

// Create a new user with role
export async function POST(request: NextRequest) {
  const authCheck = await validateAdmin(request);
  if (!authCheck.valid) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: 401 }
    );
  }
  
  try {
    const body = await request.json();
    const { email, password, role, name, phone, college, branch, year } = body;
    
    // Basic validation
    if (!email || !password || !role || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Check if user already exists
    try {
      await adminAuth.getUserByEmail(email);
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 409 }
      );
    } catch (error: any) {
      // If error is user-not-found, that's good (continue with creation)
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }
    
    // Create the user in Firebase Auth
    const userRecord = await adminAuth.createUser({
      email,
      password,
      emailVerified: false,
    });
    
    const userId = userRecord.uid;
    const timestamp = new Date().toISOString();
    
    // Add user to users collection
    await adminDb.collection('users').doc(userId).set({
      email: email.toLowerCase(),
      role,
      createdAt: timestamp,
      updatedAt: timestamp
    });
    
    // Add role-specific profile
    if (role === 'student') {
      if (!college || !branch || !year) {
        // Roll back user creation
        await adminAuth.deleteUser(userId);
        
        return NextResponse.json(
          { error: 'Missing required student fields' },
          { status: 400 }
        );
      }
      
      await adminDb.collection('students').doc(userId).set({
        name,
        email: email.toLowerCase(),
        phone: phone || '',
        college,
        branch,
        year,
        createdAt: timestamp,
        updatedAt: timestamp
      });
    } else if (role === 'admin') {
      await adminDb.collection('admins').doc(userId).set({
        name,
        email: email.toLowerCase(),
        phone: phone || '',
        createdAt: timestamp,
        updatedAt: timestamp
      });
    } else if (role === 'college') {
      if (!college) {
        // Roll back user creation
        await adminAuth.deleteUser(userId);
        
        return NextResponse.json(
          { error: 'Missing college name for college role' },
          { status: 400 }
        );
      }
      
      await adminDb.collection('colleges').doc(userId).set({
        name,
        email: email.toLowerCase(),
        phone: phone || '',
        college,
        createdAt: timestamp,
        updatedAt: timestamp
      });
    }
    
    return NextResponse.json({
      id: userId,
      email,
      role,
      created: true
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    );
  }
}

// Get list of users or a specific user
export async function GET(request: NextRequest) {
  const authCheck = await validateAdmin(request);
  if (!authCheck.valid) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: 401 }
    );
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
    const role = searchParams.get('role') as UserRole | null;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50); // Cap at 50
    
    if (userId) {
      // Get a specific user
      const userDoc = await adminDb.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      
      const userData = userDoc.data() || {};
      const userRole = userData.role as UserRole;
      
      let profileData = {};
      
      if (userRole === 'student') {
        const studentDoc = await adminDb.collection('students').doc(userId).get();
        profileData = studentDoc.exists ? studentDoc.data() || {} : {};
      } else if (userRole === 'admin') {
        const adminDoc = await adminDb.collection('admins').doc(userId).get();
        profileData = adminDoc.exists ? adminDoc.data() || {} : {};
      } else if (userRole === 'college') {
        const collegeDoc = await adminDb.collection('colleges').doc(userId).get();
        profileData = collegeDoc.exists ? collegeDoc.data() || {} : {};
      }
      
      return NextResponse.json({
        id: userId,
        ...userData,
        ...profileData
      });
    } else {
      // Get paginated list of users
      let query = adminDb.collection('users');
      
      // Apply role filter if specified
      if (role) {
        query = query.where('role', '==', role);
      }
      
      // Get total count (this is not efficient in Firestore but works for small datasets)
      const countSnapshot = await query.get();
      const totalUsers = countSnapshot.size;
      
      // Apply pagination
      const offset = (page - 1) * limit;
      const snapshot = await query.orderBy('createdAt', 'desc').limit(limit).offset(offset).get();
      
      const users = [];
      for (const doc of snapshot.docs) {
        users.push({
          id: doc.id,
          ...doc.data()
        });
      }
      
      return NextResponse.json({
        users,
        pagination: {
          page,
          limit,
          total: totalUsers,
          totalPages: Math.ceil(totalUsers / limit)
        }
      });
    }
  } catch (error: any) {
    console.error('Error getting users:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get users' },
      { status: 500 }
    );
  }
}

// Delete a user
export async function DELETE(request: NextRequest) {
  const authCheck = await validateAdmin(request);
  if (!authCheck.valid) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: 401 }
    );
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Get user data to determine collection to delete from
    const userDoc = await adminDb.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const userData = userDoc.data() || {};
    const userRole = userData.role as UserRole;
    
    // Delete from role-specific collection
    if (userRole === 'student') {
      await adminDb.collection('students').doc(userId).delete();
    } else if (userRole === 'admin') {
      await adminDb.collection('admins').doc(userId).delete();
    } else if (userRole === 'college') {
      await adminDb.collection('colleges').doc(userId).delete();
    }
    
    // Delete from users collection
    await adminDb.collection('users').doc(userId).delete();
    
    // Delete from Firebase Auth
    await adminAuth.deleteUser(userId);
    
    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete user' },
      { status: 500 }
    );
  }
} 