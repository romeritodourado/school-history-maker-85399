-- Drop problematic RLS policies on profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "SuperAdmin and AdminRede can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Directors can manage profiles in their school" ON public.profiles;

-- Create simpler, non-recursive policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());

CREATE POLICY "SuperAdmin can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "AdminRede can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'adminrede'));

CREATE POLICY "SuperAdmin can manage all profiles"
ON public.profiles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "AdminRede can manage all profiles"
ON public.profiles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'adminrede'));

CREATE POLICY "Directors can view profiles in their school"
ON public.profiles FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'diretor') AND
  school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Secretaries can view profiles in their school"
ON public.profiles FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'secretario') AND
  school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Assistants can view profiles in their school"
ON public.profiles FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'assistente') AND
  school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())
);