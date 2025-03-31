'use server';

import { createClient } from '@supabase/supabase-js';

// This file should only be imported by server components or server actions
// The service role key should never be exposed to the client

// Check for required environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY');
}

// Create a Supabase client with the service role key that's used internally
// This client bypasses RLS and should only be used in admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Instead of exporting the client directly, export async functions that use it

/**
 * Query the database with admin privileges
 */
export async function adminQuery(tableName: string) {
  return supabaseAdmin.from(tableName);
}

/**
 * Access auth admin methods
 */
export async function adminAuth() {
  return supabaseAdmin.auth.admin;
} 