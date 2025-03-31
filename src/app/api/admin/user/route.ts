import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// API handler for creating users
export async function POST(request: Request) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const userData = await request.json();
    
    // Validate the request body
    if (!userData.email || !userData.password || !userData.name || !userData.role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: {
        name: userData.name,
        role: userData.role,
      },
    });
    
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }
    
    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
    
    // Add to users table
    const { error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: authData.user.id,
        email: userData.email,
        role: userData.role,
      });
      
    if (userError) {
      // Rollback: delete the auth user if we fail to insert into users table
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }
    
    // Add role-specific data
    if (userData.role === 'student') {
      const { error: studentError } = await supabaseAdmin
        .from('students')
        .upsert({
          id: authData.user.id,
          name: userData.name,
          email: userData.email,
          phone: userData.phone || '',
          college: userData.college || '',
          branch: userData.branch || '',
          year: userData.year || '',
        });
        
      if (studentError) {
        return NextResponse.json({ error: studentError.message }, { status: 500 });
      }
    } else if (userData.role === 'admin') {
      const { error: adminError } = await supabaseAdmin
        .from('admins')
        .upsert({
          id: authData.user.id,
          name: userData.name,
          email: userData.email,
          phone: userData.phone || '',
        });
        
      if (adminError) {
        return NextResponse.json({ error: adminError.message }, { status: 500 });
      }
    } else if (userData.role === 'college') {
      const { error: collegeError } = await supabaseAdmin
        .from('colleges')
        .upsert({
          id: authData.user.id,
          name: userData.name,
          email: userData.email,
          phone: userData.phone || '',
        });
        
      if (collegeError) {
        return NextResponse.json({ error: collegeError.message }, { status: 500 });
      }
    }
    
    return NextResponse.json({ success: true, user: authData.user });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// API handler for getting users
export async function GET(request: Request) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '10');
    
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    
    // Get count of users
    const { count, error: countError } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });
      
    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }
    
    // Get users for current page
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, role')
      .range(from, to)
      .order('email', { ascending: true });
      
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Enrich with additional data
    const enrichedUsers = await Promise.all(
      data.map(async (user) => {
        let name = "";
        let phone = "";
        
        if (user.role === "student") {
          const { data: studentData } = await supabaseAdmin
            .from('students')
            .select('name, phone, college, branch, year')
            .eq('id', user.id)
            .single();
            
          if (studentData) {
            return {
              ...user,
              name: studentData.name,
              phone: studentData.phone,
              college: studentData.college,
              branch: studentData.branch,
              year: studentData.year,
            };
          }
        } else if (user.role === "admin") {
          const { data: adminData } = await supabaseAdmin
            .from('admins')
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
          const { data: collegeData } = await supabaseAdmin
            .from('colleges')
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
    
    return NextResponse.json({ 
      users: enrichedUsers, 
      totalPages: Math.ceil((count || 0) / perPage),
      totalUsers: count
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// API handler for deleting a user
export async function DELETE(request: Request) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Get user to determine role
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
      
    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 404 });
    }
    
    // Delete from role-specific table
    if (userData.role === 'student') {
      await supabaseAdmin
        .from('students')
        .delete()
        .eq('id', userId);
    } else if (userData.role === 'admin') {
      await supabaseAdmin
        .from('admins')
        .delete()
        .eq('id', userId);
    } else if (userData.role === 'college') {
      await supabaseAdmin
        .from('colleges')
        .delete()
        .eq('id', userId);
    }
    
    // Delete from users table
    const { error: deleteUserError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);
      
    if (deleteUserError) {
      return NextResponse.json({ error: deleteUserError.message }, { status: 500 });
    }
    
    // Delete from auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
} 