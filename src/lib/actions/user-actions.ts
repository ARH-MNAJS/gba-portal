'use server';

import { revalidatePath } from 'next/cache';
import * as bcrypt from 'bcryptjs';
import { adminAuth, adminDb, serializeFirestoreData } from '@/lib/firebase-admin';
import { UserRole } from '@/lib/auth-utils';

/**
 * Fetch users with pagination and optional role filter
 */
export async function fetchUsers(page: number = 1, perPage: number = 10, role?: UserRole) {
  try {
    // Query users collection
    let usersQuery = adminDb.collection('users');
    
    // Apply role filter if provided
    if (role) {
      usersQuery = usersQuery.where('role', '==', role);
    }
    
    // Get total count for pagination
    const totalSnapshot = await usersQuery.get();
    const totalUsers = totalSnapshot.size;
    
    // Calculate pagination
    const offset = (page - 1) * perPage;
    
    // Get paginated users
    const userSnapshot = await usersQuery
      .orderBy('email')
      .limit(perPage)
      .offset(offset)
      .get();
    
    // Get user data with additional details
    const users = [];
    for (const doc of userSnapshot.docs) {
      const userData = serializeFirestoreData(doc.data());
      const userId = doc.id;
      let additionalData = {};
      
      // Get role-specific data
      if (userData.role === 'student') {
        const studentDoc = await adminDb.collection('students').doc(userId).get();
        if (studentDoc.exists) {
          additionalData = serializeFirestoreData(studentDoc.data() || {});
        }
      } else if (userData.role === 'admin') {
        const adminDoc = await adminDb.collection('admins').doc(userId).get();
        if (adminDoc.exists) {
          additionalData = serializeFirestoreData(adminDoc.data() || {});
        }
      } else if (userData.role === 'college') {
        const collegeDoc = await adminDb.collection('colleges').doc(userId).get();
        if (collegeDoc.exists) {
          additionalData = serializeFirestoreData(collegeDoc.data() || {});
        }
      }
      
      users.push({
        id: userId,
        ...userData,
        ...additionalData
      });
    }
    
    return {
      users,
      totalPages: Math.ceil(totalUsers / perPage),
      totalUsers
    };
  } catch (error: any) {
    console.error('Error fetching users:', error);
    throw new Error(error.message || 'Failed to fetch users');
  }
}

/**
 * Fetch a single user by ID
 */
export async function fetchUserById(userId: string) {
  try {
    // Get user data from users collection
    const userDoc = await adminDb.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new Error('User not found');
    }
    
    const userData = serializeFirestoreData(userDoc.data() || {});
    let detailedUser = {
      id: userId,
      email: userData.email || '',
      role: userData.role as UserRole,
      name: '',
      phone: '',
      college: '',
      branch: '',
      year: '',
      createdAt: userData.createdAt || '',
      updatedAt: userData.updatedAt || '',
    };
    
    // Get role-specific data
    if (userData.role === 'student') {
      const studentDoc = await adminDb.collection('students').doc(userId).get();
      if (studentDoc.exists) {
        const studentData = serializeFirestoreData(studentDoc.data() || {});
        detailedUser = {
          ...detailedUser,
          name: studentData.name || '',
          phone: studentData.phone || '',
          college: studentData.college || '',
          branch: studentData.branch || '',
          year: studentData.year || '',
        };
      }
    } else if (userData.role === 'admin') {
      const adminDoc = await adminDb.collection('admins').doc(userId).get();
      if (adminDoc.exists) {
        const adminData = serializeFirestoreData(adminDoc.data() || {});
        detailedUser = {
          ...detailedUser,
          name: adminData.name || '',
          phone: adminData.phone || '',
        };
      }
    } else if (userData.role === 'college') {
      const collegeDoc = await adminDb.collection('colleges').doc(userId).get();
      if (collegeDoc.exists) {
        const collegeData = serializeFirestoreData(collegeDoc.data() || {});
        detailedUser = {
          ...detailedUser,
          name: collegeData.name || '',
          phone: collegeData.phone || '',
          college: collegeData.college || '',
        };
      }
    }
    
    return detailedUser;
  } catch (error: any) {
    console.error('Error fetching user details:', error);
    throw new Error(error.message || 'Failed to fetch user details');
  }
}

/**
 * Delete a user
 */
export async function deleteUser(userId: string) {
  try {
    // Get user data to determine role
    const userDoc = await adminDb.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data() || {};
    
    // Delete from role-specific collection
    if (userData.role === 'student') {
      await adminDb.collection('students').doc(userId).delete();
    } else if (userData.role === 'admin') {
      await adminDb.collection('admins').doc(userId).delete();
    } else if (userData.role === 'college') {
      await adminDb.collection('colleges').doc(userId).delete();
    }
    
    // Delete from users collection
    await adminDb.collection('users').doc(userId).delete();
    
    // Delete from Firebase Authentication
    await adminAuth.deleteUser(userId);
    
    // Revalidate users page
    revalidatePath('/admin/users');
    
    return { success: true, message: 'User deleted successfully' };
  } catch (error: any) {
    console.error('Error deleting user:', error);
    throw new Error(error.message || 'Failed to delete user');
  }
}

interface CreateUserData {
  email: string;
  password: string;
  name: string;
  role: string;
  phone?: string;
  college?: string;
  branch?: string;
  year?: string;
}

/**
 * Create a new user
 */
export async function createUser(userData: CreateUserData) {
  try {
    // Check if email already exists
    try {
      await adminAuth.getUserByEmail(userData.email);
      throw new Error('User with this email already exists');
    } catch (error: any) {
      // We expect an auth/user-not-found error, which means we can proceed
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }
    
    // Create user in Firebase Authentication
    const userRecord = await adminAuth.createUser({
      email: userData.email,
      password: userData.password,
      emailVerified: false,
    });
    
    const userId = userRecord.uid;
    const timestamp = new Date().toISOString();
    
    // Add to users collection
    await adminDb.collection('users').doc(userId).set({
      email: userData.email.toLowerCase(),
      role: userData.role,
      createdAt: timestamp,
      updatedAt: timestamp
    });
    
    // Add role-specific data
    if (userData.role === 'student') {
      await adminDb.collection('students').doc(userId).set({
        name: userData.name,
        email: userData.email.toLowerCase(),
        phone: userData.phone || '',
        college: userData.college || '',
        branch: userData.branch || '',
        year: userData.year || '',
        createdAt: timestamp,
        updatedAt: timestamp
      });
    } else if (userData.role === 'admin') {
      await adminDb.collection('admins').doc(userId).set({
        name: userData.name,
        email: userData.email.toLowerCase(),
        phone: userData.phone || '',
        createdAt: timestamp,
        updatedAt: timestamp
      });
    } else if (userData.role === 'college') {
      await adminDb.collection('colleges').doc(userId).set({
        name: userData.name,
        email: userData.email.toLowerCase(),
        phone: userData.phone || '',
        college: userData.college || '',
        createdAt: timestamp,
        updatedAt: timestamp
      });
    }
    
    // Revalidate users page
    revalidatePath('/admin/users');
    
    return { success: true, userId };
  } catch (error: any) {
    console.error('Error creating user:', error);
    throw new Error(error.message || 'Failed to create user');
  }
}

interface BulkImportResult {
  success: number;
  failed: number;
  errors: Array<{ email: string; error: string }>;
}

/**
 * Bulk import users (students)
 */
export async function bulkImportUsers(
  rows: Array<{ name: string; email: string; phone: string }>,
  commonData: { college: string; branch: string; year: string }
): Promise<BulkImportResult> {
  const result: BulkImportResult = {
    success: 0,
    failed: 0,
    errors: []
  };
  
  for (const row of rows) {
    try {
      // Generate a random password
      const password = Math.random().toString(36).substring(2, 10);
      
      // Create the user
      await createUser({
        email: row.email,
        password,
        name: row.name,
        role: 'student',
        phone: row.phone,
        college: commonData.college,
        branch: commonData.branch,
        year: commonData.year
      });
      
      result.success++;
    } catch (error: any) {
      result.failed++;
      result.errors.push({
        email: row.email,
        error: error.message || 'Unknown error'
      });
    }
  }
  
  // Revalidate users page
  revalidatePath('/admin/users');
  
  return result;
} 