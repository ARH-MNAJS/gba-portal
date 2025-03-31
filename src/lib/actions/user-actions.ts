'use server';

import { adminQuery, adminAuth } from '../supabase-admin';
import { revalidatePath } from 'next/cache';

/**
 * Fetch users with pagination
 */
export async function fetchUsers(page: number = 1, perPage: number = 10) {
  try {
    // Get count of all users for pagination
    const { count, error: countError } = await (await adminQuery('users'))
      .select('*', { count: 'exact', head: true });
    
    if (countError) throw countError;
    
    // Calculate pagination values
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    
    // Fetch users for the current page
    const { data, error } = await (await adminQuery('users'))
      .select('id, email, role')
      .range(from, to)
      .order('email', { ascending: true });
    
    if (error) throw error;
    
    if (!data) return { users: [], totalPages: 0, totalUsers: 0 };
    
    // Fetch additional details for each user
    const enrichedUsers = await Promise.all(
      data.map(async (user) => {
        let name = "";
        let phone = "";
        
        if (user.role === "student") {
          const { data: studentData } = await (await adminQuery('students'))
            .select('name, phone, college, branch, year')
            .eq('id', user.id)
            .single();
            
          if (studentData) {
            return {
              ...user,
              name: studentData.name,
              phone: studentData.phone || '',
              college: studentData.college || '',
              branch: studentData.branch || '',
              year: studentData.year || '',
            };
          }
        } else if (user.role === "admin") {
          const { data: adminData } = await (await adminQuery('admins'))
            .select('name, phone')
            .eq('id', user.id)
            .single();
            
          if (adminData) {
            return {
              ...user,
              name: adminData.name,
              phone: adminData.phone || '',
            };
          }
        } else if (user.role === "college") {
          const { data: collegeData } = await (await adminQuery('colleges'))
            .select('name, phone')
            .eq('id', user.id)
            .single();
            
          if (collegeData) {
            return {
              ...user,
              name: collegeData.name,
              phone: collegeData.phone || '',
            };
          }
        }
        
        return {
          ...user,
          name,
          phone,
        };
      })
    );
    
    return {
      users: enrichedUsers,
      totalPages: Math.ceil((count || 0) / perPage),
      totalUsers: count || 0
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
    // Fetch user data from the users table
    const { data: userData, error: userError } = await (await adminQuery('users'))
      .select('*')
      .eq('id', userId)
      .single();
      
    if (userError) throw userError;
    
    if (!userData) {
      throw new Error('User not found');
    }
    
    let detailedUser = {
      id: userData.id,
      email: userData.email,
      role: userData.role,
      name: '',
      phone: '',
      college: '',
      branch: '',
      year: '',
      created_at: undefined,
      last_sign_in_at: undefined,
    };
    
    // Get role-specific data
    if (userData.role === 'student') {
      const { data: studentData, error: studentError } = await (await adminQuery('students'))
        .select('*')
        .eq('id', userId)
        .single();
        
      if (!studentError && studentData) {
        detailedUser = {
          ...detailedUser,
          name: studentData.name,
          phone: studentData.phone || '',
          college: studentData.college || '',
          branch: studentData.branch || '',
          year: studentData.year || '',
        };
      }
    } else if (userData.role === 'admin') {
      const { data: adminData, error: adminError } = await (await adminQuery('admins'))
        .select('*')
        .eq('id', userId)
        .single();
        
      if (!adminError && adminData) {
        detailedUser = {
          ...detailedUser,
          name: adminData.name,
          phone: adminData.phone || '',
        };
      }
    } else if (userData.role === 'college') {
      const { data: collegeData, error: collegeError } = await (await adminQuery('colleges'))
        .select('*')
        .eq('id', userId)
        .single();
        
      if (!collegeError && collegeData) {
        detailedUser = {
          ...detailedUser,
          name: collegeData.name,
          phone: collegeData.phone || '',
        };
      }
    }
    
    // Get auth metadata
    const { data: authData, error: authError } = await (await adminAuth()).getUserById(userId);
    
    if (!authError && authData?.user) {
      detailedUser.created_at = authData.user.created_at;
      detailedUser.last_sign_in_at = authData.user.last_sign_in_at;
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
    // Get user to determine role
    const { data: userData, error: userError } = await (await adminQuery('users'))
      .select('role')
      .eq('id', userId)
      .single();
      
    if (userError) throw userError;
    
    // Delete from role-specific table
    if (userData.role === 'student') {
      const { error: studentError } = await (await adminQuery('students'))
        .delete()
        .eq('id', userId);
        
      if (studentError) throw studentError;
    } else if (userData.role === 'admin') {
      const { error: adminError } = await (await adminQuery('admins'))
        .delete()
        .eq('id', userId);
        
      if (adminError) throw adminError;
    } else if (userData.role === 'college') {
      const { error: collegeError } = await (await adminQuery('colleges'))
        .delete()
        .eq('id', userId);
        
      if (collegeError) throw collegeError;
    }
    
    // Delete from users table
    const { error: userDeleteError } = await (await adminQuery('users'))
      .delete()
      .eq('id', userId);
      
    if (userDeleteError) throw userDeleteError;
    
    // Delete from auth
    const { error: authError } = await (await adminAuth()).deleteUser(userId);
    
    if (authError) throw authError;
    
    // Revalidate the users page to update the list
    revalidatePath('/admin/user');
    
    return { success: true };
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
    // Create the user in Supabase Auth
    const { data: authData, error: authError } = await (await adminAuth()).createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: false,
      user_metadata: {
        name: userData.name,
        role: userData.role,
      },
    });
    
    if (authError) throw authError;
    
    if (!authData.user) {
      throw new Error('Failed to create user');
    }
    
    // Add to users table
    const { error: userError } = await (await adminQuery('users'))
      .upsert({
        id: authData.user.id,
        email: userData.email,
        role: userData.role,
      });
      
    if (userError) {
      // Rollback: delete the auth user if users table insert fails
      await (await adminAuth()).deleteUser(authData.user.id);
      throw userError;
    }
    
    // Add role-specific data
    if (userData.role === 'student') {
      const { error: studentError } = await (await adminQuery('students'))
        .upsert({
          id: authData.user.id,
          name: userData.name,
          email: userData.email,
          phone: userData.phone || '',
          college: userData.college || '',
          branch: userData.branch || '',
          year: userData.year || '',
        });
        
      if (studentError) throw studentError;
    } else if (userData.role === 'admin') {
      const { error: adminError } = await (await adminQuery('admins'))
        .upsert({
          id: authData.user.id,
          name: userData.name,
          email: userData.email,
          phone: userData.phone || '',
        });
        
      if (adminError) throw adminError;
    } else if (userData.role === 'college') {
      const { error: collegeError } = await (await adminQuery('colleges'))
        .upsert({
          id: authData.user.id,
          name: userData.name,
          email: userData.email,
          phone: userData.phone || '',
        });
        
      if (collegeError) throw collegeError;
    }
    
    // Revalidate the users page to update the list
    revalidatePath('/admin/user');
    
    return { success: true, user: authData.user };
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
 * Import users in bulk
 */
export async function bulkImportUsers(
  rows: Array<{ name: string; email: string; phone: string }>,
  commonData: { college: string; branch: string; year: string }
): Promise<BulkImportResult> {
  const result: BulkImportResult = {
    success: 0,
    failed: 0,
    errors: [],
  };
  
  for (const row of rows) {
    try {
      // Validate data
      if (!row.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        throw new Error("Invalid email format");
      }
      
      if (!row.phone || !/^\d{10}$/.test(row.phone)) {
        throw new Error("Phone must be 10 digits");
      }
      
      // Create random password
      const password = Math.random().toString(36).slice(-8);
      
      // Create user
      await createUser({
        email: row.email,
        password,
        name: row.name,
        role: 'student',
        phone: row.phone,
        college: commonData.college,
        branch: commonData.branch,
        year: commonData.year,
      });
      
      result.success++;
    } catch (error: any) {
      result.failed++;
      result.errors.push({
        email: row.email,
        error: error.message || 'Unknown error',
      });
    }
  }
  
  return result;
} 