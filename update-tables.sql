-- SQL script to set up necessary tables in Supabase

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('student', 'admin', 'college')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create admins table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);

-- Create students table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  college TEXT,
  branch TEXT,
  year TEXT
);

-- Create colleges table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.colleges (
  id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  college TEXT NOT NULL
);

-- Create RLS policies to allow access to authenticated users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY admin_all_access ON public.users 
  FOR ALL 
  TO authenticated 
  USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));

CREATE POLICY admin_all_access ON public.admins 
  FOR ALL 
  TO authenticated 
  USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));

CREATE POLICY admin_all_access ON public.students 
  FOR ALL 
  TO authenticated 
  USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));

CREATE POLICY admin_all_access ON public.colleges 
  FOR ALL 
  TO authenticated 
  USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));

-- Create policies for users to view their own data
CREATE POLICY view_own_data ON public.users 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = id);

-- Create function to add a user to the correct role-specific table
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- Add user to the appropriate role-specific table
  IF NEW.role = 'admin' THEN
    INSERT INTO public.admins (id, name, email)
    VALUES (NEW.id, 'Admin User', NEW.email);
  ELSIF NEW.role = 'student' THEN
    INSERT INTO public.students (id, name, email)
    VALUES (NEW.id, 'Student User', NEW.email);
  ELSIF NEW.role = 'college' THEN
    INSERT INTO public.colleges (id, name, email, college)
    VALUES (NEW.id, 'College User', NEW.email, 'Default College');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to add new users to role-specific tables
CREATE OR REPLACE TRIGGER on_user_created
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user(); 