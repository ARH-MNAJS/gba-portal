-- Enable Row Level Security for all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Admins can do anything with users" ON public.users;
DROP POLICY IF EXISTS "Students can view their own data" ON public.students;
DROP POLICY IF EXISTS "Admins can do anything with students" ON public.students;
DROP POLICY IF EXISTS "Admins can view and edit admin data" ON public.admins;
DROP POLICY IF EXISTS "Colleges can view their own data" ON public.colleges;
DROP POLICY IF EXISTS "Admins can do anything with colleges" ON public.colleges;

-- Create policies for the users table
CREATE POLICY "Users can view their own data"
ON public.users
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Admins can do anything with users"
ON public.users
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Create policies for the students table
CREATE POLICY "Students can view their own data"
ON public.students
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Admins can do anything with students"
ON public.students
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Create policies for the admins table
CREATE POLICY "Admins can view and edit admin data"
ON public.admins
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Create policies for the colleges table
CREATE POLICY "Colleges can view their own data"
ON public.colleges
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Admins can do anything with colleges"
ON public.colleges
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- If using the service_role key for admin operations, make sure it has the correct permissions
-- This happens automatically with the service role key, but we'll document it here
-- The service role bypasses RLS policies completely 