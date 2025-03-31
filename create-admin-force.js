// Script to create an admin user directly in Supabase with auto-confirmation
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Create a Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

// Using service role key if available for admin operations
const supabase = createClient(
  supabaseUrl,
  serviceRoleKey || supabaseAnonKey
);

async function createAdminUser() {
  try {
    console.log('Creating admin user with auto-confirmation...');
    
    // 1. Create the user with admin permissions - we'll first try to delete if exists
    const { data: deleteData, error: deleteError } = await supabase.auth.admin.deleteUser(
      '5d6926ae-3c8d-406e-8061-b61ea0deb298'
    );
    
    if (deleteError && !deleteError.message.includes('User not found')) {
      console.error('Error deleting existing user:', deleteError);
    }
    
    // Create the user with admin permissions
    const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
      email: 'aditya@campuscredential.co.in',
      password: 'Campus@123',
      email_confirm: true,
      user_metadata: {
        role: 'admin',
        name: 'Aditya Singh'
      }
    });

    if (adminError) {
      console.error('Error creating admin user:', adminError);
      return;
    }

    console.log('Admin auth user created with email auto-confirmed:', adminData.user.id);

    // 2. Add the user to the users table with role 'admin'
    const { data: userData, error: userError } = await supabase
      .from('users')
      .upsert({
        id: adminData.user.id,
        email: 'aditya@campuscredential.co.in',
        role: 'admin',
      });

    if (userError) {
      console.error('Error adding user to database:', userError);
    } else {
      console.log('User record created successfully');
    }

    // 3. Add to the admins table too
    const { data: adminDbData, error: adminDbError } = await supabase
      .from('admins')
      .upsert({
        id: adminData.user.id,
        name: 'Aditya Singh',
        email: 'aditya@campuscredential.co.in',
      });

    if (adminDbError) {
      console.error('Error adding admin to database:', adminDbError);
    } else {
      console.log('Admin record created successfully');
    }

    console.log('Admin user setup completed successfully');
    
    // Try to login to verify
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'aditya@campuscredential.co.in',
      password: 'Campus@123'
    });

    if (authError) {
      console.error('Error verifying login:', authError);
    } else {
      console.log('Login verification successful!');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createAdminUser(); 