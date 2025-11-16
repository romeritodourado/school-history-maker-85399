-- Drop all existing problematic RLS policies on profiles
DROP POLICY IF EXISTS "Directors can view profiles in their school" ON public.profiles;
DROP POLICY IF EXISTS "Secretaries can view profiles in their school" ON public.profiles;
DROP POLICY IF EXISTS "Assistants can view profiles in their school" ON public.profiles;
DROP POLICY IF EXISTS "AdminRede can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "SuperAdmin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "AdminRede can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "SuperAdmin can manage all profiles" ON public.profiles;

-- Create new simplified RLS policies for profiles
-- SuperAdmin has full access to everything
CREATE POLICY "SuperAdmin full access to profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- AdminRede can view and manage all profiles
CREATE POLICY "AdminRede can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'adminrede'::app_role));

CREATE POLICY "AdminRede can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'adminrede'::app_role))
WITH CHECK (has_role(auth.uid(), 'adminrede'::app_role));

CREATE POLICY "AdminRede can insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'adminrede'::app_role));

CREATE POLICY "AdminRede can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'adminrede'::app_role));

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- School staff can view profiles in their school (non-recursive)
CREATE POLICY "School staff can view school profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- User is viewing profiles from their own school
  school_id IS NOT NULL 
  AND school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
  AND (
    has_role(auth.uid(), 'diretor'::app_role) OR
    has_role(auth.uid(), 'secretario'::app_role) OR
    has_role(auth.uid(), 'assistente'::app_role)
  )
);