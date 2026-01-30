-- Add new roles to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'teacher';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'worker_intern';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'student';

-- Add school column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school text;

-- Create a function to check if admin already exists
CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE role = 'admin'
  )
$$;