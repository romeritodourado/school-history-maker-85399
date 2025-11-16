--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: academic_years; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academic_years (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    calendar_year integer NOT NULL,
    grade_level text NOT NULL,
    school_name text DEFAULT 'Escola Municipal Aldori Luiz Tolazzi'::text NOT NULL,
    city text DEFAULT 'Luís Eduardo Magalhães'::text NOT NULL,
    state text DEFAULT 'BA'::text NOT NULL,
    shift text,
    class_name text,
    created_at timestamp with time zone DEFAULT now(),
    reclassified boolean DEFAULT false
);


--
-- Name: annual_grades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.annual_grades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    academic_year_id uuid NOT NULL,
    subject_name text NOT NULL,
    grade numeric(4,2),
    workload integer,
    absences integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    category text DEFAULT 'Base Nacional Comum'::text,
    CONSTRAINT annual_grades_category_check CHECK ((category = ANY (ARRAY['Base Nacional Comum'::text, 'Base Diversificada'::text])))
);


--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name text NOT NULL,
    mother_name text NOT NULL,
    father_name text,
    birth_date date NOT NULL,
    birth_place text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    student_status text DEFAULT 'cursando'::text,
    grade_series text,
    birth_state text DEFAULT 'BA'::text NOT NULL,
    CONSTRAINT students_student_status_check CHECK ((student_status = ANY (ARRAY['cursando'::text, 'transferido'::text, 'concluído'::text])))
);


--
-- Name: trimester_grades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trimester_grades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    academic_year_id uuid NOT NULL,
    subject_name text NOT NULL,
    trimester integer NOT NULL,
    grade numeric(4,2),
    absences integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT trimester_grades_trimester_check CHECK ((trimester = ANY (ARRAY[1, 2, 3])))
);


--
-- Name: workload_configurations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workload_configurations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    grade_level text NOT NULL,
    subject_name text NOT NULL,
    workload integer NOT NULL,
    category text NOT NULL,
    academic_year integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT workload_configurations_category_check CHECK ((category = ANY (ARRAY['Base Nacional Comum'::text, 'Base Diversificada'::text])))
);


--
-- Name: academic_years academic_years_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_years
    ADD CONSTRAINT academic_years_pkey PRIMARY KEY (id);


--
-- Name: annual_grades annual_grades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.annual_grades
    ADD CONSTRAINT annual_grades_pkey PRIMARY KEY (id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: trimester_grades trimester_grades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trimester_grades
    ADD CONSTRAINT trimester_grades_pkey PRIMARY KEY (id);


--
-- Name: workload_configurations workload_configurations_grade_level_subject_name_academic_y_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workload_configurations
    ADD CONSTRAINT workload_configurations_grade_level_subject_name_academic_y_key UNIQUE (grade_level, subject_name, academic_year);


--
-- Name: workload_configurations workload_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workload_configurations
    ADD CONSTRAINT workload_configurations_pkey PRIMARY KEY (id);


--
-- Name: idx_academic_years_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_academic_years_student ON public.academic_years USING btree (student_id);


--
-- Name: idx_annual_grades_academic_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_annual_grades_academic_year ON public.annual_grades USING btree (academic_year_id);


--
-- Name: idx_annual_grades_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_annual_grades_student ON public.annual_grades USING btree (student_id);


--
-- Name: idx_trimester_grades_academic_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trimester_grades_academic_year ON public.trimester_grades USING btree (academic_year_id);


--
-- Name: students update_students_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: workload_configurations update_workload_configurations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_workload_configurations_updated_at BEFORE UPDATE ON public.workload_configurations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: academic_years academic_years_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_years
    ADD CONSTRAINT academic_years_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: annual_grades annual_grades_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.annual_grades
    ADD CONSTRAINT annual_grades_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE CASCADE;


--
-- Name: annual_grades annual_grades_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.annual_grades
    ADD CONSTRAINT annual_grades_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: trimester_grades trimester_grades_academic_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trimester_grades
    ADD CONSTRAINT trimester_grades_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id) ON DELETE CASCADE;


--
-- Name: academic_years Allow public delete from academic_years; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete from academic_years" ON public.academic_years FOR DELETE USING (true);


--
-- Name: annual_grades Allow public delete from annual_grades; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete from annual_grades" ON public.annual_grades FOR DELETE USING (true);


--
-- Name: students Allow public delete from students; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete from students" ON public.students FOR DELETE USING (true);


--
-- Name: trimester_grades Allow public delete from trimester_grades; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete from trimester_grades" ON public.trimester_grades FOR DELETE USING (true);


--
-- Name: workload_configurations Allow public delete from workload_configurations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete from workload_configurations" ON public.workload_configurations FOR DELETE USING (true);


--
-- Name: academic_years Allow public insert to academic_years; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert to academic_years" ON public.academic_years FOR INSERT WITH CHECK (true);


--
-- Name: annual_grades Allow public insert to annual_grades; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert to annual_grades" ON public.annual_grades FOR INSERT WITH CHECK (true);


--
-- Name: students Allow public insert to students; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert to students" ON public.students FOR INSERT WITH CHECK (true);


--
-- Name: trimester_grades Allow public insert to trimester_grades; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert to trimester_grades" ON public.trimester_grades FOR INSERT WITH CHECK (true);


--
-- Name: workload_configurations Allow public insert to workload_configurations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert to workload_configurations" ON public.workload_configurations FOR INSERT WITH CHECK (true);


--
-- Name: academic_years Allow public read access to academic_years; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access to academic_years" ON public.academic_years FOR SELECT USING (true);


--
-- Name: annual_grades Allow public read access to annual_grades; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access to annual_grades" ON public.annual_grades FOR SELECT USING (true);


--
-- Name: students Allow public read access to students; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access to students" ON public.students FOR SELECT USING (true);


--
-- Name: trimester_grades Allow public read access to trimester_grades; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access to trimester_grades" ON public.trimester_grades FOR SELECT USING (true);


--
-- Name: workload_configurations Allow public read access to workload_configurations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access to workload_configurations" ON public.workload_configurations FOR SELECT USING (true);


--
-- Name: academic_years Allow public update to academic_years; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update to academic_years" ON public.academic_years FOR UPDATE USING (true);


--
-- Name: annual_grades Allow public update to annual_grades; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update to annual_grades" ON public.annual_grades FOR UPDATE USING (true);


--
-- Name: students Allow public update to students; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update to students" ON public.students FOR UPDATE USING (true);


--
-- Name: trimester_grades Allow public update to trimester_grades; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update to trimester_grades" ON public.trimester_grades FOR UPDATE USING (true);


--
-- Name: workload_configurations Allow public update to workload_configurations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update to workload_configurations" ON public.workload_configurations FOR UPDATE USING (true);


--
-- Name: academic_years; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;

--
-- Name: annual_grades; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.annual_grades ENABLE ROW LEVEL SECURITY;

--
-- Name: students; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

--
-- Name: trimester_grades; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trimester_grades ENABLE ROW LEVEL SECURITY;

--
-- Name: workload_configurations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workload_configurations ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


