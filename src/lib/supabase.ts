"use client";

import { createClient } from '@supabase/supabase-js';

// Check for required environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Create a Supabase client with the anon key
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Add a function to get a client with the session access token
export function getSupabaseClient(accessToken?: string) {
  if (!accessToken) {
    return supabase;
  }
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );
}

// Types for roles
export type UserRole = 'admin' | 'student' | 'college';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  college: string;
  branch: string;
  year: string;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
}

export interface College {
  id: string;
  name: string;
  email: string;
  college: string;
}

// Function to initialize required tables if they don't exist
export const initializeDatabase = async () => {
  try {
    // console.log("Checking database tables...");
    
    // Check if users table exists
    const { error: usersError } = await supabase.from('users').select('id').limit(1);
    
    // If users table doesn't exist, we can't create it from client side
    // This would require server-side initialization or manual table creation in Supabase dashboard
    if (usersError) {
      // console.error("Users table may not exist. Please create it in Supabase dashboard:", usersError);
    }
    
    // Check other tables
    const tables = ['students', 'admins', 'colleges'];
    
    for (const table of tables) {
      const { error } = await supabase.from(table).select('id').limit(1);
      
      if (error) {
        // console.error(`Table '${table}' may not exist. Please create it in Supabase dashboard:`, error);
      }
    }
    
    // console.log("Database check completed.");
  } catch (error) {
    // console.error("Error initializing database:", error);
  }
}; 