-- Fix RLS policies for academic data tables
-- Remove overly permissive 'true' policies and add proper role-based access control

-- =====================================================
-- ACADEMIC YEARS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Allow public read access to academic_years" ON public.academic_years;
DROP POLICY IF EXISTS "Allow public insert to academic_years" ON public.academic_years;
DROP POLICY IF EXISTS "Allow public update to academic_years" ON public.academic_years;
DROP POLICY IF EXISTS "Allow public delete from academic_years" ON public.academic_years;

-- SuperAdmin and AdminRede can view all academic years
CREATE POLICY "SuperAdmin and AdminRede can view all academic years"
ON public.academic_years FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'superadmin') OR 
  public.has_role(auth.uid(), 'adminrede')
);

-- School staff can view academic years for students in their school
CREATE POLICY "School staff can view academic years for their school"
ON public.academic_years FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT s.id FROM public.students s
    INNER JOIN public.profiles p ON p.school_id = s.school_id
    WHERE p.id = auth.uid()
  )
);

-- SuperAdmin and AdminRede can insert academic years
CREATE POLICY "SuperAdmin and AdminRede can insert academic years"
ON public.academic_years FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'superadmin') OR 
  public.has_role(auth.uid(), 'adminrede')
);

-- School staff can insert academic years for students in their school
CREATE POLICY "School staff can insert academic years for their school"
ON public.academic_years FOR INSERT
TO authenticated
WITH CHECK (
  (public.has_role(auth.uid(), 'diretor') OR 
   public.has_role(auth.uid(), 'secretario') OR 
   public.has_role(auth.uid(), 'assistente')) AND
  student_id IN (
    SELECT s.id FROM public.students s
    INNER JOIN public.profiles p ON p.school_id = s.school_id
    WHERE p.id = auth.uid()
  )
);

-- SuperAdmin and AdminRede can update academic years
CREATE POLICY "SuperAdmin and AdminRede can update academic years"
ON public.academic_years FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'superadmin') OR 
  public.has_role(auth.uid(), 'adminrede')
);

-- School staff can update academic years for students in their school
CREATE POLICY "School staff can update academic years for their school"
ON public.academic_years FOR UPDATE
TO authenticated
USING (
  student_id IN (
    SELECT s.id FROM public.students s
    INNER JOIN public.profiles p ON p.school_id = s.school_id
    WHERE p.id = auth.uid()
  )
);

-- SuperAdmin and AdminRede can delete academic years
CREATE POLICY "SuperAdmin and AdminRede can delete academic years"
ON public.academic_years FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'superadmin') OR 
  public.has_role(auth.uid(), 'adminrede')
);

-- =====================================================
-- ANNUAL GRADES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Allow public read access to annual_grades" ON public.annual_grades;
DROP POLICY IF EXISTS "Allow public insert to annual_grades" ON public.annual_grades;
DROP POLICY IF EXISTS "Allow public update to annual_grades" ON public.annual_grades;
DROP POLICY IF EXISTS "Allow public delete from annual_grades" ON public.annual_grades;

-- SuperAdmin and AdminRede can view all grades
CREATE POLICY "SuperAdmin and AdminRede can view all grades"
ON public.annual_grades FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'superadmin') OR 
  public.has_role(auth.uid(), 'adminrede')
);

-- School staff can view grades for students in their school
CREATE POLICY "School staff can view grades for their school"
ON public.annual_grades FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT s.id FROM public.students s
    INNER JOIN public.profiles p ON p.school_id = s.school_id
    WHERE p.id = auth.uid()
  )
);

-- SuperAdmin and AdminRede can insert grades
CREATE POLICY "SuperAdmin and AdminRede can insert grades"
ON public.annual_grades FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'superadmin') OR 
  public.has_role(auth.uid(), 'adminrede')
);

-- School staff can insert grades for students in their school
CREATE POLICY "School staff can insert grades for their school"
ON public.annual_grades FOR INSERT
TO authenticated
WITH CHECK (
  (public.has_role(auth.uid(), 'diretor') OR 
   public.has_role(auth.uid(), 'secretario') OR 
   public.has_role(auth.uid(), 'assistente')) AND
  student_id IN (
    SELECT s.id FROM public.students s
    INNER JOIN public.profiles p ON p.school_id = s.school_id
    WHERE p.id = auth.uid()
  )
);

-- SuperAdmin and AdminRede can update grades
CREATE POLICY "SuperAdmin and AdminRede can update grades"
ON public.annual_grades FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'superadmin') OR 
  public.has_role(auth.uid(), 'adminrede')
);

-- School staff can update grades for students in their school
CREATE POLICY "School staff can update grades for their school"
ON public.annual_grades FOR UPDATE
TO authenticated
USING (
  student_id IN (
    SELECT s.id FROM public.students s
    INNER JOIN public.profiles p ON p.school_id = s.school_id
    WHERE p.id = auth.uid()
  )
);

-- SuperAdmin and AdminRede can delete grades
CREATE POLICY "SuperAdmin and AdminRede can delete grades"
ON public.annual_grades FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'superadmin') OR 
  public.has_role(auth.uid(), 'adminrede')
);

-- =====================================================
-- TRIMESTER GRADES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Allow public read access to trimester_grades" ON public.trimester_grades;
DROP POLICY IF EXISTS "Allow public insert to trimester_grades" ON public.trimester_grades;
DROP POLICY IF EXISTS "Allow public update to trimester_grades" ON public.trimester_grades;
DROP POLICY IF EXISTS "Allow public delete from trimester_grades" ON public.trimester_grades;

-- SuperAdmin and AdminRede can view all trimester grades
CREATE POLICY "SuperAdmin and AdminRede can view all trimester grades"
ON public.trimester_grades FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'superadmin') OR 
  public.has_role(auth.uid(), 'adminrede')
);

-- School staff can view trimester grades for students in their school
CREATE POLICY "School staff can view trimester grades for their school"
ON public.trimester_grades FOR SELECT
TO authenticated
USING (
  academic_year_id IN (
    SELECT ay.id FROM public.academic_years ay
    INNER JOIN public.students s ON s.id = ay.student_id
    INNER JOIN public.profiles p ON p.school_id = s.school_id
    WHERE p.id = auth.uid()
  )
);

-- SuperAdmin and AdminRede can insert trimester grades
CREATE POLICY "SuperAdmin and AdminRede can insert trimester grades"
ON public.trimester_grades FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'superadmin') OR 
  public.has_role(auth.uid(), 'adminrede')
);

-- School staff can insert trimester grades for students in their school
CREATE POLICY "School staff can insert trimester grades for their school"
ON public.trimester_grades FOR INSERT
TO authenticated
WITH CHECK (
  (public.has_role(auth.uid(), 'diretor') OR 
   public.has_role(auth.uid(), 'secretario') OR 
   public.has_role(auth.uid(), 'assistente')) AND
  academic_year_id IN (
    SELECT ay.id FROM public.academic_years ay
    INNER JOIN public.students s ON s.id = ay.student_id
    INNER JOIN public.profiles p ON p.school_id = s.school_id
    WHERE p.id = auth.uid()
  )
);

-- SuperAdmin and AdminRede can update trimester grades
CREATE POLICY "SuperAdmin and AdminRede can update trimester grades"
ON public.trimester_grades FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'superadmin') OR 
  public.has_role(auth.uid(), 'adminrede')
);

-- School staff can update trimester grades for students in their school
CREATE POLICY "School staff can update trimester grades for their school"
ON public.trimester_grades FOR UPDATE
TO authenticated
USING (
  academic_year_id IN (
    SELECT ay.id FROM public.academic_years ay
    INNER JOIN public.students s ON s.id = ay.student_id
    INNER JOIN public.profiles p ON p.school_id = s.school_id
    WHERE p.id = auth.uid()
  )
);

-- SuperAdmin and AdminRede can delete trimester grades
CREATE POLICY "SuperAdmin and AdminRede can delete trimester grades"
ON public.trimester_grades FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'superadmin') OR 
  public.has_role(auth.uid(), 'adminrede')
);

-- =====================================================
-- WORKLOAD CONFIGURATIONS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Allow public read access to workload_configurations" ON public.workload_configurations;
DROP POLICY IF EXISTS "Allow public insert to workload_configurations" ON public.workload_configurations;
DROP POLICY IF EXISTS "Allow public update to workload_configurations" ON public.workload_configurations;
DROP POLICY IF EXISTS "Allow public delete from workload_configurations" ON public.workload_configurations;

-- Everyone authenticated can read workload configurations
CREATE POLICY "Authenticated users can view workload configurations"
ON public.workload_configurations FOR SELECT
TO authenticated
USING (true);

-- Only SuperAdmin and AdminRede can manage workload configurations
CREATE POLICY "SuperAdmin and AdminRede can manage workload configurations"
ON public.workload_configurations FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'superadmin') OR 
  public.has_role(auth.uid(), 'adminrede')
);