-- Ensure SuperAdmin has unrestricted access to all schools data
-- This is separate from school_id assignment - superadmin can have school_id NULL

-- Update students policies to ensure superadmin access
DROP POLICY IF EXISTS "Users can view students in their school" ON public.students;

CREATE POLICY "SuperAdmin can view all students"
ON public.students
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "AdminRede can view all students"
ON public.students
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'adminrede'::app_role));

CREATE POLICY "School staff can view students in their school"
ON public.students
FOR SELECT
TO authenticated
USING (
  school_id IS NOT NULL
  AND school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())
  AND (
    has_role(auth.uid(), 'diretor'::app_role) OR
    has_role(auth.uid(), 'secretario'::app_role) OR
    has_role(auth.uid(), 'assistente'::app_role)
  )
);

-- Update academic_years policies
DROP POLICY IF EXISTS "SuperAdmin and AdminRede can view all academic years" ON public.academic_years;
DROP POLICY IF EXISTS "School staff can view academic years for their school" ON public.academic_years;

CREATE POLICY "SuperAdmin can view all academic years"
ON public.academic_years
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "AdminRede can view all academic years"
ON public.academic_years
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'adminrede'::app_role));

CREATE POLICY "School staff can view academic years for their school"
ON public.academic_years
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT s.id
    FROM students s
    JOIN profiles p ON p.school_id = s.school_id
    WHERE p.id = auth.uid()
      AND s.school_id IS NOT NULL
      AND (
        has_role(auth.uid(), 'diretor'::app_role) OR
        has_role(auth.uid(), 'secretario'::app_role) OR
        has_role(auth.uid(), 'assistente'::app_role)
      )
  )
);

-- Update annual_grades policies
DROP POLICY IF EXISTS "SuperAdmin and AdminRede can view all grades" ON public.annual_grades;
DROP POLICY IF EXISTS "School staff can view grades for their school" ON public.annual_grades;

CREATE POLICY "SuperAdmin can view all annual grades"
ON public.annual_grades
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "AdminRede can view all annual grades"
ON public.annual_grades
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'adminrede'::app_role));

CREATE POLICY "School staff can view annual grades for their school"
ON public.annual_grades
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT s.id
    FROM students s
    JOIN profiles p ON p.school_id = s.school_id
    WHERE p.id = auth.uid()
      AND s.school_id IS NOT NULL
      AND (
        has_role(auth.uid(), 'diretor'::app_role) OR
        has_role(auth.uid(), 'secretario'::app_role) OR
        has_role(auth.uid(), 'assistente'::app_role)
      )
  )
);

-- Update trimester_grades policies
DROP POLICY IF EXISTS "SuperAdmin and AdminRede can view all trimester grades" ON public.trimester_grades;
DROP POLICY IF EXISTS "School staff can view trimester grades for their school" ON public.trimester_grades;

CREATE POLICY "SuperAdmin can view all trimester grades"
ON public.trimester_grades
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "AdminRede can view all trimester grades"
ON public.trimester_grades
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'adminrede'::app_role));

CREATE POLICY "School staff can view trimester grades for their school"
ON public.trimester_grades
FOR SELECT
TO authenticated
USING (
  academic_year_id IN (
    SELECT ay.id
    FROM academic_years ay
    JOIN students s ON s.id = ay.student_id
    JOIN profiles p ON p.school_id = s.school_id
    WHERE p.id = auth.uid()
      AND s.school_id IS NOT NULL
      AND (
        has_role(auth.uid(), 'diretor'::app_role) OR
        has_role(auth.uid(), 'secretario'::app_role) OR
        has_role(auth.uid(), 'assistente'::app_role)
      )
  )
);