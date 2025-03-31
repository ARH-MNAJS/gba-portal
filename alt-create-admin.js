// Alternative approach - directly add admin to database without authentication
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

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

async function createAdminDirect() {
  try {
    console.log('Checking for existing admin user...');
    
    // Check if admin already exists
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'aditya@campuscredential.co.in');
    
    if (checkError) {
      console.error('Error checking for existing user:', checkError);
      
      // Try to create the users table
      const { error: createUsersError } = await supabase.rpc('create_users_table');
      if (createUsersError) {
        console.error('Error creating users table:', createUsersError);
      }
    }
    
    if (existingUsers && existingUsers.length > 0) {
      console.log('Admin user already exists in database:', existingUsers);
      return;
    }
    
    // Generate a random UUID for the user
    const userId = uuidv4();
    
    // 1. Add the user to the users table with role 'admin'
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: 'aditya@campuscredential.co.in',
        role: 'admin',
      });

    if (userError) {
      console.error('Error adding user to database:', userError);
      return;
    }
    
    console.log('Admin user added to users table successfully');

    // 2. Check if admins table exists
    const { data: adminsCheck, error: adminsCheckError } = await supabase
      .from('admins')
      .select('*')
      .limit(1);
    
    if (adminsCheckError) {
      console.error('Error checking admins table:', adminsCheckError);
      
      // Try to create the admins table
      const { error: createAdminsError } = await supabase.rpc('create_admins_table');
      if (createAdminsError) {
        console.error('Error creating admins table:', createAdminsError);
      }
    }

    // 3. Add to the admins table
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .insert({
        id: userId,
        name: 'Aditya Singh',
        email: 'aditya@campuscredential.co.in',
      });

    if (adminError) {
      console.error('Error adding admin to database:', adminError);
    } else {
      console.log('Admin added to admins table successfully');
    }

    console.log('Admin user setup completed successfully. NOTE: You will need to manually set up authentication for this user in Supabase dashboard.');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createAdminDirect(); 