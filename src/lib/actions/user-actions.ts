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
    console.log(`[fetchUsers] Fetching users with role: ${role}, page: ${page}, perPage: ${perPage}`);
    
    // Ensure valid values for pagination
    page = Math.max(1, page);
    perPage = Math.min(Math.max(1, perPage), 100); // Limit to reasonable range
    
    // Directly query the role-specific collection instead of the users collection
    let collectionName = 'users';
    if (role === 'student') {
      collectionName = 'students';
    } else if (role === 'admin') {
      collectionName = 'admins';
    } else if (role === 'college') {
      collectionName = 'colleges';
    }
    
    console.log(`[fetchUsers] Querying collection: ${collectionName}`);
    
    // Get total count for pagination
    try {
      // Query the appropriate collection directly
      const totalSnapshot = await adminDb.collection(collectionName).get();
      const totalUsers = totalSnapshot.size;
      console.log(`[fetchUsers] Total ${role}s found: ${totalUsers}`);
      
      // Calculate pagination
      const offset = (page - 1) * perPage;
      
      // Get paginated users with error handling
      let userSnapshot;
      try {
        userSnapshot = await adminDb.collection(collectionName)
          .orderBy('email')
          .limit(perPage)
          .offset(offset)
          .get();
        
        console.log(`[fetchUsers] ${role}s in current page: ${userSnapshot.size}`);
      } catch (queryError) {
        console.error(`[fetchUsers] Error in paginated query:`, queryError);
        
        // Fallback to getting all users and manual pagination
        console.log(`[fetchUsers] Falling back to getting all ${role}s`);
        userSnapshot = await adminDb.collection(collectionName).get();
        
        // Manual pagination
        const allDocs = userSnapshot.docs;
        const startIdx = Math.min(offset, allDocs.length);
        const endIdx = Math.min(startIdx + perPage, allDocs.length);
        
        userSnapshot = {
          docs: allDocs.slice(startIdx, endIdx),
          size: endIdx - startIdx
        };
        
        console.log(`[fetchUsers] Manual pagination results: ${userSnapshot.size} ${role}s`);
      }
      
      // Get user data directly from role-specific collection
      const users = [];
      for (const doc of userSnapshot.docs) {
        const roleData = serializeFirestoreData(doc.data());
        const userId = doc.id;
        console.log(`[fetchUsers] Processing ${role}: ${userId}`);
        
        // Create user object with the role-specific data
        const user = {
          id: userId,
          role: role || 'unknown',
          ...roleData
        };
        
        console.log(`[fetchUsers] Adding ${role} to results: ${userId}`);
        users.push(user);
      }
      
      console.log(`[fetchUsers] Final ${role}s array length: ${users.length}`);
      
      return {
        users,
        totalPages: Math.max(1, Math.ceil(totalUsers / perPage)),
        totalUsers
      };
    } catch (countError) {
      console.error(`[fetchUsers] Error querying ${collectionName}:`, countError);
      throw new Error(`Failed to fetch ${role}s`);
    }
  } catch (error: any) {
    console.error('[fetchUsers] Error fetching users:', error);
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