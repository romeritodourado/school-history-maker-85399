-- Create security definer function to get user's school_id (avoids recursion)
CREATE OR REPLACE FUNCTION public.get_user_school_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id
  FROM public.profiles
  WHERE id = _user_id
$$;

-- ============================================
-- PROFILES TABLE - Fix infinite recursion
-- ============================================
DROP POLICY IF EXISTS "School staff can view school profiles" ON public.profiles;

CREATE POLICY "School staff can view school profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  school_id IS NOT NULL
  AND school_id = public.get_user_school_id(auth.uid())
  AND (
    has_role(auth.uid(), 'diretor'::app_role) OR
    has_role(auth.uid(), 'secretario'::app_role) OR
    has_role(auth.uid(), 'assistente'::app_role)
  )
);

-- ============================================
-- SCHOOLS TABLE - Remove all existing policies first
-- ============================================
DROP POLICY IF EXISTS "SuperAdmin total access to schools" ON public.schools;
DROP POLICY IF EXISTS "AdminRede can manage schools" ON public.schools;
DROP POLICY IF EXISTS "School staff can view their school" ON public.schools;
DROP POLICY IF EXISTS "SuperAdmin and AdminRede can manage all schools" ON public.schools;

-- Create new SuperAdmin policy
CREATE POLICY "SuperAdmin total access to schools"
ON public.schools
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- AdminRede can manage schools
CREATE POLICY "AdminRede can manage schools"
ON public.schools
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'adminrede'::app_role))
WITH CHECK (has_role(auth.uid(), 'adminrede'::app_role));

-- School staff can only view their own school
CREATE POLICY "School staff can view their school"
ON public.schools
FOR SELECT
TO authenticated
USING (
  id = public.get_user_school_id(auth.uid())
);

-- ============================================
-- STUDENTS TABLE - Remove all existing policies first
-- ============================================
DROP POLICY IF EXISTS "SuperAdmin total access to students" ON public.students;
DROP POLICY IF EXISTS "AdminRede full access to students" ON public.students;
DROP POLICY IF EXISTS "School staff can view their school students" ON public.students;
DROP POLICY IF EXISTS "School staff can create students in their school" ON public.students;
DROP POLICY IF EXISTS "School staff can update their school students" ON public.students;
DROP POLICY IF EXISTS "SuperAdmin can view all students" ON public.students;
DROP POLICY IF EXISTS "AdminRede can view all students" ON public.students;
DROP POLICY IF EXISTS "School staff can view students in their school" ON public.students;
DROP POLICY IF EXISTS "Authorized users can create students" ON public.students;
DROP POLICY IF EXISTS "Authorized users can update students" ON public.students;
DROP POLICY IF EXISTS "SuperAdmin and AdminRede can delete students" ON public.students;

-- SuperAdmin TOTAL access
CREATE POLICY "SuperAdmin total access to students"
ON public.students
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- AdminRede full access
CREATE POLICY "AdminRede full access to students"
ON public.students
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'adminrede'::app_role))
WITH CHECK (has_role(auth.uid(), 'adminrede'::app_role));

-- School staff limited to their school
CREATE POLICY "School staff can view their school students"
ON public.students
FOR SELECT
TO authenticated
USING (
  school_id IS NOT NULL
  AND school_id = public.get_user_school_id(auth.uid())
  AND (
    has_role(auth.uid(), 'diretor'::app_role) OR
    has_role(auth.uid(), 'secretario'::app_role) OR
    has_role(auth.uid(), 'assistente'::app_role)
  )
);

CREATE POLICY "School staff can create students in their school"
ON public.students
FOR INSERT
TO authenticated
WITH CHECK (
  school_id = public.get_user_school_id(auth.uid())
  AND (
    has_role(auth.uid(), 'diretor'::app_role) OR
    has_role(auth.uid(), 'secretario'::app_role) OR
    has_role(auth.uid(), 'assistente'::app_role)
  )
);

CREATE POLICY "School staff can update their school students"
ON public.students
FOR UPDATE
TO authenticated
USING (
  school_id = public.get_user_school_id(auth.uid())
)
WITH CHECK (
  school_id = public.get_user_school_id(auth.uid())
);

-- ============================================
-- USER_ROLES TABLE - Remove all existing policies first
-- ============================================
DROP POLICY IF EXISTS "SuperAdmin total access to user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "AdminRede can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Directors can manage school roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "SuperAdmin can manage all roles" ON public.user_roles;

-- SuperAdmin TOTAL access to all roles
CREATE POLICY "SuperAdmin total access to user_roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- AdminRede can manage non-superadmin roles
CREATE POLICY "AdminRede can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'adminrede'::app_role)
  AND role != 'superadmin'::app_role
)
WITH CHECK (
  has_role(auth.uid(), 'adminrede'::app_role)
  AND role != 'superadmin'::app_role
);

-- Directors can manage school staff roles
CREATE POLICY "Directors can manage school roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'diretor'::app_role)
  AND role IN ('secretario'::app_role, 'assistente'::app_role)
);

-- ============================================
-- ACADEMIC_YEARS TABLE - Remove all existing policies first
-- ============================================
DROP POLICY IF EXISTS "SuperAdmin total access to academic_years" ON public.academic_years;
DROP POLICY IF EXISTS "AdminRede full access to academic_years" ON public.academic_years;
DROP POLICY IF EXISTS "School staff can manage their school academic_years" ON public.academic_years;
DROP POLICY IF EXISTS "SuperAdmin can view all academic years" ON public.academic_years;
DROP POLICY IF EXISTS "AdminRede can view all academic years" ON public.academic_years;
DROP POLICY IF EXISTS "School staff can view academic years for their school" ON public.academic_years;
DROP POLICY IF EXISTS "SuperAdmin and AdminRede can insert academic years" ON public.academic_years;
DROP POLICY IF EXISTS "School staff can insert academic years for their school" ON public.academic_years;
DROP POLICY IF EXISTS "SuperAdmin and AdminRede can update academic years" ON public.academic_years;
DROP POLICY IF EXISTS "School staff can update academic years for their school" ON public.academic_years;
DROP POLICY IF EXISTS "SuperAdmin and AdminRede can delete academic years" ON public.academic_years;

-- SuperAdmin TOTAL access
CREATE POLICY "SuperAdmin total access to academic_years"
ON public.academic_years
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- AdminRede full access
CREATE POLICY "AdminRede full access to academic_years"
ON public.academic_years
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'adminrede'::app_role))
WITH CHECK (has_role(auth.uid(), 'adminrede'::app_role));

-- School staff limited to their school
CREATE POLICY "School staff can manage their school academic_years"
ON public.academic_years
FOR ALL
TO authenticated
USING (
  student_id IN (
    SELECT s.id
    FROM students s
    WHERE s.school_id = public.get_user_school_id(auth.uid())
  )
  AND (
    has_role(auth.uid(), 'diretor'::app_role) OR
    has_role(auth.uid(), 'secretario'::app_role) OR
    has_role(auth.uid(), 'assistente'::app_role)
  )
)
WITH CHECK (
  student_id IN (
    SELECT s.id
    FROM students s
    WHERE s.school_id = public.get_user_school_id(auth.uid())
  )
  AND (
    has_role(auth.uid(), 'diretor'::app_role) OR
    has_role(auth.uid(), 'secretario'::app_role) OR
    has_role(auth.uid(), 'assistente'::app_role)
  )
);

-- ============================================
-- ANNUAL_GRADES TABLE - Remove all existing policies first
-- ============================================
DROP POLICY IF EXISTS "SuperAdmin total access to annual_grades" ON public.annual_grades;
DROP POLICY IF EXISTS "AdminRede full access to annual_grades" ON public.annual_grades;
DROP POLICY IF EXISTS "School staff can manage their school annual_grades" ON public.annual_grades;
DROP POLICY IF EXISTS "SuperAdmin can view all annual grades" ON public.annual_grades;
DROP POLICY IF EXISTS "AdminRede can view all annual grades" ON public.annual_grades;
DROP POLICY IF EXISTS "School staff can view annual grades for their school" ON public.annual_grades;
DROP POLICY IF EXISTS "SuperAdmin and AdminRede can insert grades" ON public.annual_grades;
DROP POLICY IF EXISTS "School staff can insert grades for their school" ON public.annual_grades;
DROP POLICY IF EXISTS "SuperAdmin and AdminRede can update grades" ON public.annual_grades;
DROP POLICY IF EXISTS "School staff can update grades for their school" ON public.annual_grades;
DROP POLICY IF EXISTS "SuperAdmin and AdminRede can delete grades" ON public.annual_grades;

-- SuperAdmin TOTAL access
CREATE POLICY "SuperAdmin total access to annual_grades"
ON public.annual_grades
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- AdminRede full access
CREATE POLICY "AdminRede full access to annual_grades"
ON public.annual_grades
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'adminrede'::app_role))
WITH CHECK (has_role(auth.uid(), 'adminrede'::app_role));

-- School staff limited to their school
CREATE POLICY "School staff can manage their school annual_grades"
ON public.annual_grades
FOR ALL
TO authenticated
USING (
  student_id IN (
    SELECT s.id
    FROM students s
    WHERE s.school_id = public.get_user_school_id(auth.uid())
  )
  AND (
    has_role(auth.uid(), 'diretor'::app_role) OR
    has_role(auth.uid(), 'secretario'::app_role) OR
    has_role(auth.uid(), 'assistente'::app_role)
  )
)
WITH CHECK (
  student_id IN (
    SELECT s.id
    FROM students s
    WHERE s.school_id = public.get_user_school_id(auth.uid())
  )
  AND (
    has_role(auth.uid(), 'diretor'::app_role) OR
    has_role(auth.uid(), 'secretario'::app_role) OR
    has_role(auth.uid(), 'assistente'::app_role)
  )
);

-- ============================================
-- TRIMESTER_GRADES TABLE - Remove all existing policies first
-- ============================================
DROP POLICY IF EXISTS "SuperAdmin total access to trimester_grades" ON public.trimester_grades;
DROP POLICY IF EXISTS "AdminRede full access to trimester_grades" ON public.trimester_grades;
DROP POLICY IF EXISTS "School staff can manage their school trimester_grades" ON public.trimester_grades;
DROP POLICY IF EXISTS "SuperAdmin can view all trimester grades" ON public.trimester_grades;
DROP POLICY IF EXISTS "AdminRede can view all trimester grades" ON public.trimester_grades;
DROP POLICY IF EXISTS "School staff can view trimester grades for their school" ON public.trimester_grades;
DROP POLICY IF EXISTS "SuperAdmin and AdminRede can insert trimester grades" ON public.trimester_grades;
DROP POLICY IF EXISTS "School staff can insert trimester grades for their school" ON public.trimester_grades;
DROP POLICY IF EXISTS "SuperAdmin and AdminRede can update trimester grades" ON public.trimester_grades;
DROP POLICY IF EXISTS "School staff can update trimester grades for their school" ON public.trimester_grades;
DROP POLICY IF EXISTS "SuperAdmin and AdminRede can delete trimester grades" ON public.trimester_grades;

-- SuperAdmin TOTAL access
CREATE POLICY "SuperAdmin total access to trimester_grades"
ON public.trimester_grades
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- AdminRede full access
CREATE POLICY "AdminRede full access to trimester_grades"
ON public.trimester_grades
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'adminrede'::app_role))
WITH CHECK (has_role(auth.uid(), 'adminrede'::app_role));

-- School staff limited to their school
CREATE POLICY "School staff can manage their school trimester_grades"
ON public.trimester_grades
FOR ALL
TO authenticated
USING (
  academic_year_id IN (
    SELECT ay.id
    FROM academic_years ay
    JOIN students s ON s.id = ay.student_id
    WHERE s.school_id = public.get_user_school_id(auth.uid())
  )
  AND (
    has_role(auth.uid(), 'diretor'::app_role) OR
    has_role(auth.uid(), 'secretario'::app_role) OR
    has_role(auth.uid(), 'assistente'::app_role)
  )
)
WITH CHECK (
  academic_year_id IN (
    SELECT ay.id
    FROM academic_years ay
    JOIN students s ON s.id = ay.student_id
    WHERE s.school_id = public.get_user_school_id(auth.uid())
  )
  AND (
    has_role(auth.uid(), 'diretor'::app_role) OR
    has_role(auth.uid(), 'secretario'::app_role) OR
    has_role(auth.uid(), 'assistente'::app_role)
  )
);

-- ============================================
-- WORKLOAD_CONFIGURATIONS TABLE - Remove all existing policies first
-- ============================================
DROP POLICY IF EXISTS "SuperAdmin total access to workload_configurations" ON public.workload_configurations;
DROP POLICY IF EXISTS "AdminRede can manage workload_configurations" ON public.workload_configurations;
DROP POLICY IF EXISTS "All authenticated can view workload_configurations" ON public.workload_configurations;
DROP POLICY IF EXISTS "Authenticated users can view workload configurations" ON public.workload_configurations;
DROP POLICY IF EXISTS "SuperAdmin and AdminRede can manage workload configurations" ON public.workload_configurations;

-- SuperAdmin TOTAL access
CREATE POLICY "SuperAdmin total access to workload_configurations"
ON public.workload_configurations
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- AdminRede can manage
CREATE POLICY "AdminRede can manage workload_configurations"
ON public.workload_configurations
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'adminrede'::app_role))
WITH CHECK (has_role(auth.uid(), 'adminrede'::app_role));

-- Everyone can view
CREATE POLICY "All authenticated can view workload_configurations"
ON public.workload_configurations
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- SIGNATURES TABLE - Remove all existing policies first
-- ============================================
DROP POLICY IF EXISTS "SuperAdmin total access to signatures" ON public.signatures;
DROP POLICY IF EXISTS "All can view signatures" ON public.signatures;
DROP POLICY IF EXISTS "Authorized users can create signatures" ON public.signatures;
DROP POLICY IF EXISTS "Anyone can view signatures" ON public.signatures;

-- SuperAdmin TOTAL access
CREATE POLICY "SuperAdmin total access to signatures"
ON public.signatures
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- Everyone can view
CREATE POLICY "All can view signatures"
ON public.signatures
FOR SELECT
TO authenticated
USING (true);

-- Authorized users can create
CREATE POLICY "Authorized users can create signatures"
ON public.signatures
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'adminrede'::app_role) OR
  has_role(auth.uid(), 'diretor'::app_role) OR
  has_role(auth.uid(), 'secretario'::app_role)
);