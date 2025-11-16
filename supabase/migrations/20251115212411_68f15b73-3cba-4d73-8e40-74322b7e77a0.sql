-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('superadmin', 'adminrede', 'diretor', 'secretario', 'assistente');

-- Create schools table
CREATE TABLE public.schools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  inep_code TEXT,
  address TEXT,
  city TEXT NOT NULL DEFAULT 'Luís Eduardo Magalhães',
  state TEXT NOT NULL DEFAULT 'BA',
  director_id UUID,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create signatures table for digital signatures
CREATE TABLE public.signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transcript_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  pdf_hash TEXT NOT NULL,
  algorithm TEXT NOT NULL DEFAULT 'SHA256',
  ip_address TEXT,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add school_id and status to students table
ALTER TABLE public.students
ADD COLUMN school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
ADD COLUMN status TEXT NOT NULL DEFAULT 'rascunho';

-- Add signature fields to students table for transcript status
ALTER TABLE public.students
ADD COLUMN transcript_status TEXT DEFAULT 'rascunho',
ADD COLUMN signed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN completion_year INTEGER;

-- Enable RLS on new tables
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'superadmin' THEN 1
      WHEN 'adminrede' THEN 2
      WHEN 'diretor' THEN 3
      WHEN 'secretario' THEN 4
      WHEN 'assistente' THEN 5
    END
  LIMIT 1
$$;

-- RLS Policies for schools
CREATE POLICY "SuperAdmin and AdminRede can manage all schools"
ON public.schools FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'superadmin') OR 
  public.has_role(auth.uid(), 'adminrede')
);

CREATE POLICY "School staff can view their school"
ON public.schools FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT school_id FROM public.profiles WHERE id = auth.uid()
  ) OR
  public.has_role(auth.uid(), 'superadmin') OR
  public.has_role(auth.uid(), 'adminrede')
);

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "SuperAdmin and AdminRede can manage all profiles"
ON public.profiles FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'superadmin') OR 
  public.has_role(auth.uid(), 'adminrede')
);

CREATE POLICY "Directors can manage profiles in their school"
ON public.profiles FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'diretor') AND
  school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "SuperAdmin can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "AdminRede can manage non-superadmin roles"
ON public.user_roles FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'adminrede') AND
  role != 'superadmin'
);

-- RLS Policies for signatures
CREATE POLICY "Anyone can view signatures"
ON public.signatures FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authorized users can create signatures"
ON public.signatures FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'diretor') OR
  public.has_role(auth.uid(), 'secretario') OR
  public.has_role(auth.uid(), 'superadmin') OR
  public.has_role(auth.uid(), 'adminrede')
);

-- Update students RLS to consider school context
DROP POLICY IF EXISTS "Allow public read access to students" ON public.students;
DROP POLICY IF EXISTS "Allow public insert to students" ON public.students;
DROP POLICY IF EXISTS "Allow public update to students" ON public.students;
DROP POLICY IF EXISTS "Allow public delete from students" ON public.students;

CREATE POLICY "Users can view students in their school"
ON public.students FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'superadmin') OR
  public.has_role(auth.uid(), 'adminrede') OR
  school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Authorized users can create students"
ON public.students FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'superadmin') OR
  public.has_role(auth.uid(), 'adminrede') OR
  public.has_role(auth.uid(), 'diretor') OR
  public.has_role(auth.uid(), 'secretario') OR
  public.has_role(auth.uid(), 'assistente')
);

CREATE POLICY "Authorized users can update students"
ON public.students FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'superadmin') OR
  public.has_role(auth.uid(), 'adminrede') OR
  (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()))
);

CREATE POLICY "SuperAdmin and AdminRede can delete students"
ON public.students FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'superadmin') OR
  public.has_role(auth.uid(), 'adminrede')
);

-- Create triggers for updated_at
CREATE TRIGGER update_schools_updated_at
BEFORE UPDATE ON public.schools
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Novo Usuário')
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();