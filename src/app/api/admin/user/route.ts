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
    
    // Check admin status directly in admins collection
    const adminDoc = await adminDb.collection('admins').doc(decodedToken.uid).get();
    if (!adminDoc.exists) {
      return {
        valid: false,
        error: 'Unauthorized - User not found or not an admin'
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
    
    // User data will be stored directly in role-specific collections
    
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
      // Check each collection for the user
      let userData = null;
      let userRole: UserRole | null = null;
      let profileData = {};
      
      // Try students collection
      const studentDoc = await adminDb.collection('students').doc(userId).get();
      if (studentDoc.exists) {
        userData = studentDoc.data() || {};
        userRole = 'student';
        profileData = userData;
      }
      
      // Try admins collection if not found
      if (!userData) {
        const adminDoc = await adminDb.collection('admins').doc(userId).get();
        if (adminDoc.exists) {
          userData = adminDoc.data() || {};
          userRole = 'admin';
          profileData = userData;
        }
      }
      
      // Try colleges collection if not found
      if (!userData) {
        const collegesRef = adminDb.collection('colleges');
        const collegeQuery = await collegesRef.where('adminId', '==', userId).get();
        
        if (!collegeQuery.empty) {
          const collegeDoc = collegeQuery.docs[0];
          userData = collegeDoc.data() || {};
          userRole = 'college';
          profileData = userData;
        }
      }
      
      if (!userData) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      // profileData is already set above, no need to fetch again
      
      return NextResponse.json({
        id: userId,
        ...userData,
        ...profileData
      });
    } else {
      // Get paginated list of users from the appropriate collection
      let collectionName = 'students'; // Default to students
      
      if (role) {
        // Use the specified role collection
        if (role === 'admin') {
          collectionName = 'admins';
        } else if (role === 'college') {
          collectionName = 'colleges';
        }
      }
      
      // Query the appropriate collection
      const roleCollection = adminDb.collection(collectionName);
      
      // Get total count (this is not efficient in Firestore but works for small datasets)
      const countSnapshot = await roleCollection.get();
      const totalUsers = countSnapshot.size;
      
      // Apply pagination
      const offset = (page - 1) * limit;
      const snapshot = await roleCollection.orderBy('createdAt', 'desc').limit(limit).offset(offset).get();
      
      const users = [];
      for (const doc of snapshot.docs) {
        users.push({
          id: doc.id,
          ...doc.data(),
          role: collectionName === 'students' ? 'student' : 
                collectionName === 'admins' ? 'admin' : 'college'
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
    
    // Check each collection to find the user
    let userRole: UserRole | null = null;
    
    // Check students collection
    const studentDoc = await adminDb.collection('students').doc(userId).get();
    if (studentDoc.exists) {
      userRole = 'student';
    }
    
    // Check admins collection if not found
    if (!userRole) {
      const adminDoc = await adminDb.collection('admins').doc(userId).get();
      if (adminDoc.exists) {
        userRole = 'admin';
      }
    }
    
    // Check colleges collection if not found
    if (!userRole) {
      const collegesRef = adminDb.collection('colleges');
      const collegeQuery = await collegesRef.where('adminId', '==', userId).get();
      
      if (!collegeQuery.empty) {
        const collegeDoc = collegeQuery.docs[0];
        userRole = 'college';
      }
    }
    
    if (!userRole) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Delete from role-specific collection
    if (userRole === 'student') {
      await adminDb.collection('students').doc(userId).delete();
    } else if (userRole === 'admin') {
      await adminDb.collection('admins').doc(userId).delete();
    } else if (userRole === 'college') {
      await adminDb.collection('colleges').doc(userId).delete();
    }
    
    // No need to delete from users collection since we're not using it
    
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