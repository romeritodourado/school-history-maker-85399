-- Add observations column to students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS observations text;

-- Add school period columns to academic_years table for trimester grades
ALTER TABLE public.academic_years 
ADD COLUMN IF NOT EXISTS school_period_start text,
ADD COLUMN IF NOT EXISTS school_period_end text,
ADD COLUMN IF NOT EXISTS trimester_year text,
ADD COLUMN IF NOT EXISTS trimester_shift text;