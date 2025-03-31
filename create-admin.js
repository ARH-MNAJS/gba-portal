// Script to create an admin user directly in Supabase
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

async function createAdminUser() {
  try {
    console.log('Creating admin user...');
    
    // 1. Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'aditya@campuscredential.co.in',
      password: 'Campus@123',
      options: {
        data: {
          role: 'admin',
          name: 'Aditya Singh'
        }
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return;
    }

    console.log('Auth user created:', authData.user.id);

    // Fetch the structure of the users table to see what columns it has
    const { data: tableInfo, error: tableError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (tableError) {
      console.log('Error fetching table structure, trying to create it:', tableError);
      
      // Try to create the users table if it doesn't exist
      const { error: createTableError } = await supabase.rpc('create_users_table_if_not_exists');
      
      if (createTableError) {
        console.error('Could not create users table:', createTableError);
      }
    }

    console.log('Table info:', tableInfo);

    // 2. Add the user to the users table with role 'admin'
    const { data: userData, error: userError } = await supabase
      .from('users')
      .upsert({
        id: authData.user.id,
        email: 'aditya@campuscredential.co.in',
        role: 'admin',
      });

    if (userError) {
      console.error('Error adding user to database:', userError);
      return;
    }

    // 3. Add to the admins table too
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .upsert({
        id: authData.user.id,
        name: 'Aditya Singh',
        email: 'aditya@campuscredential.co.in',
      });

    if (adminError) {
      console.error('Error adding admin to database:', adminError);
    }

    console.log('Admin user created successfully');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createAdminUser(); 