// Script to check for the admin user in Supabase
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Create a Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

async function checkAdminUser() {
  try {
    console.log('Checking for admin user...');
    
    // Try to login as the admin user to test if it exists
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'aditya@campuscredential.co.in',
      password: 'Campus@123'
    });

    if (authError) {
      console.error('Error signing in as admin:', authError);
      return;
    }

    console.log('Successfully signed in as admin:', authData.user.id);
    
    // Try to create the users table if it doesn't exist
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'aditya@campuscredential.co.in');

    if (usersError) {
      console.error('Error checking users table:', usersError);
    } else {
      console.log('Users data:', usersData);
    }

    // Create the users record if it doesn't exist
    if (!usersError && (!usersData || usersData.length === 0)) {
      console.log('Creating users record...');
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .upsert({
          id: authData.user.id,
          email: 'aditya@campuscredential.co.in',
          role: 'admin',
        });

      if (userError) {
        console.error('Error adding user to database:', userError);
      } else {
        console.log('User record created successfully');
      }
    }

    // Check admins table
    const { data: adminsData, error: adminsError } = await supabase
      .from('admins')
      .select('*')
      .eq('email', 'aditya@campuscredential.co.in');

    if (adminsError) {
      console.error('Error checking admins table:', adminsError);
    } else {
      console.log('Admins data:', adminsData);
    }

    // Create the admins record if it doesn't exist
    if (!adminsError && (!adminsData || adminsData.length === 0)) {
      console.log('Creating admins record...');
      
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .upsert({
          id: authData.user.id,
          name: 'Aditya Singh',
          email: 'aditya@campuscredential.co.in',
        });

      if (adminError) {
        console.error('Error adding admin to database:', adminError);
      } else {
        console.log('Admin record created successfully');
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkAdminUser(); 