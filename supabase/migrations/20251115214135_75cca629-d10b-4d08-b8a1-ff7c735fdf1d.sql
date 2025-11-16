-- Drop existing policies on user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "SuperAdmin can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "AdminRede can manage non-superadmin roles" ON public.user_roles;

-- Create simpler policies for user_roles
-- Everyone authenticated can read their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- SuperAdmin can do everything
CREATE POLICY "SuperAdmin can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'superadmin'
  )
);

-- AdminRede can manage non-superadmin roles
CREATE POLICY "AdminRede can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'adminrede'
  ) AND role != 'superadmin'
);

-- Directors can manage roles for their school staff
CREATE POLICY "Directors can manage school roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'diretor'
  ) AND role IN ('secretario', 'assistente')
);