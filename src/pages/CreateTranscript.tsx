import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import correctLogo from "/correct-logo.png";
import { GradesTable } from "@/components/transcript/GradesTable";
import { TrimesterGradesTable } from "@/components/transcript/TrimesterGradesTable";
import { AcademicYearsTable } from "@/components/transcript/AcademicYearsTable";
import { WORKLOAD_BY_GRADE } from "@/lib/workloadData";
import { studentSchema } from "@/lib/validationSchemas";
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SUBJECTS = [
  "Língua Portuguesa",
  "Matemática",
  "Ciências",
  "Geografia",
  "História",
  "Educação Física",
  "Arte",
  "Ensino Religioso",
  "Língua Estrangeira (Inglês)",
  "Produção Textual",
];

const GRADE_LEVELS = ["1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano"];
const STUDENT_STATUS_OPTIONS = ["cursando", "transferido", "concluído", "conservado"];


export interface AcademicYear {
  calendar_year: number;
  grade_level: string;
  school_name: string;
  city: string;
  state: string;
  shift: string;
  class_name: string;
  reclassified?: boolean;
  school_period_start?: string | null;
  school_period_end?: string | null;
  trimester_year?: string | null;
  trimester_shift?: string | null;
}

export interface Grade {
  subject_name: string;
  grade: string;
  workload: string;
  absences: string;
}

export interface TrimesterGrade {
  subject_name: string;
  trimester: number;
  grade: string;
  absences: string;
}

interface SchoolOption {
  id: string;
  name: string;
  municipality_id: string;
  city: string | null;
  state: string | null;
}

// Função para gerar o hash do conteúdo do histórico
async function generateTranscriptHash(data: any): Promise<string> {
  const dataString = JSON.stringify(data);
  const textEncoder = new TextEncoder();
  const dataBuffer = textEncoder.encode(dataString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

const CreateTranscript = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(!!id); // True if editing, false if creating
  const { user, profile, role } = useAuth();
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);

  // Student data
  const [studentData, setStudentData] = useState({
    full_name: "",
    mother_name: "",
    father_name: "",
    birth_date: "",
    birth_place: "",
    birth_state: "BA",
    student_status: "cursando", // This is the overall student status, not per year
    grade_series: "",
    observations: "",
  });

  // Academic years
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([
    {
      calendar_year: new Date().getFullYear(),
      grade_level: "1º Ano",
      school_name: "",
      city: "",
      state: "",
      shift: "",
      class_name: "",
      reclassified: false,
    },
  ]);

  // Grades per year - initialize with default workload from workloadData.ts
  const [yearGrades, setYearGrades] = useState<{ [key: string]: Grade[] }>(() => {
    const initial: { [key: string]: Grade[] } = {};
    GRADE_LEVELS.forEach((level) => {
      const workloadData = WORKLOAD_BY_GRADE[level] || {};
      initial[level] = SUBJECTS.map((subject) => ({
        subject_name: subject,
        grade: "",
        workload: workloadData[subject]?.toString() || "",
        absences: "0",
      }));
    });
    return initial;
  });

  // Custom subjects per grade level (not directly used in this simplified version, but kept for structure)
  const [customSubjects, setCustomSubjects] = useState<{ [key: string]: string[] }>({});

  // Trimester grades for current year
  const [trimesterGrades, setTrimesterGrades] = useState<TrimesterGrade[]>([]);

  // School period for trimester grades
  const [schoolPeriod, setSchoolPeriod] = useState({
    startDate: "",
    endDate: "",
    gradeClass: "",
    shift: "",
  });

  // Store the latest academic year ID for trimester grades (not directly used in this simplified version)
  const [latestAcademicYearId, setLatestAcademicYearId] = useState<string | null>(null);

  // 1. Fetch schools based on user role and profile
  useEffect(() => {
    const fetchSchools = async () => {
      try {
        let query = supabase
          .from('schools')
          .select('id, name, municipality_id, city, state');

        if ((role === 'municipal_secretary' || role === 'network_manager') && profile?.municipality_id) {
          query = query.eq('municipality_id', profile.municipality_id);
        } else if (['school_admin', 'vice_school_admin', 'secretary', 'administrative_assistant'].includes(role || '')) {
          query = query.eq('id', profile?.school_id);
        }

        const { data, error } = await query;
        if (error) throw error;
        setSchools(data || []);
        console.log("Fetched schools:", data);
      } catch (error) {
        console.error('Error fetching schools:', error);
      }
    };

    fetchSchools();
  }, [profile, role]);

  // 2. Load existing transcript data (student, academic years, grades)
  useEffect(() => {
    if (id) {
      loadTranscriptData();
    }
  }, [id]);

  // 3. Determine e set selectedSchoolId once schools and studentData are available
  useEffect(() => {
    // Only proceed if schools are loaded and we are not actively loading transcript data
    if (schools.length === 0 || loadingData) {
      console.log("Skipping school selection logic:", { schoolsLoaded: schools.length > 0, loadingData });
      return;
    }

    let newSelectedSchoolId: string | null = null;

    // If editing an existing transcript and studentData has a school_id
    if (id && studentData.school_id) {
      newSelectedSchoolId = studentData.school_id;
      console.log("Setting school from loaded student data (editing):", newSelectedSchoolId);
    } 
    // If creating a new transcript
    else if (!id) {
      const schoolIdFromUrl = searchParams.get('schoolId');
      if (schoolIdFromUrl && schools.some(s => s.id === schoolIdFromUrl)) {
        newSelectedSchoolId = schoolIdFromUrl;
        console.log("Setting school from URL param (new transcript):", newSelectedSchoolId);
      } else if (profile?.school_id && schools.some(s => s.id === profile.school_id)) {
        newSelectedSchoolId = profile.school_id;
        console.log("Setting school from user profile (new transcript):", newSelectedSchoolId);
      } else if (schools.length === 1) {
        newSelectedSchoolId = schools[0].id;
        console.log("Setting school from single available school (new transcript):", newSelectedSchoolId);
      }
    }

    // Update selectedSchoolId state only if it's different
    if (newSelectedSchoolId !== selectedSchoolId) {
      console.log("Updating selectedSchoolId from", selectedSchoolId, "to", newSelectedSchoolId);
      setSelectedSchoolId(newSelectedSchoolId);
    } else {
      console.log("selectedSchoolId is already set or no new selection:", selectedSchoolId);
    }
  }, [schools, id, studentData.school_id, profile?.school_id, searchParams, loadingData, selectedSchoolId]);

  // 4. Update academicYears school info when selectedSchoolId changes
  useEffect(() => {
    const school = schools.find(s => s.id === selectedSchoolId);
    if (school) {
      setAcademicYears(prevYears => prevYears.map(year => ({
        ...year,
        school_name: school.name,
        city: school.city || "",
        state: school.state || "",
      })));
    } else {
      // If no school is selected or found, clear the school info
      setAcademicYears(prevYears => prevYears.map(year => ({
        ...year,
        school_name: "",
        city: "",
        state: "",
      })));
    }
  }, [selectedSchoolId, schools]);

  const updateWorkloadsFromDatabase = async () => {
    try {
      // Ensure academicYears is not empty before iterating
      if (academicYears.length === 0) return;

      for (const year of academicYears) {
        const { data, error } = await supabase
          .from("workload_configurations")
          .select("*")
          .eq("grade_level", year.grade_level)
          .eq("academic_year", year.calendar_year);

        if (error) {
          console.error("Error loading workload:", error);
          continue;
        }

        if (data && data.length > 0) {
          setYearGrades(prevGrades => {
            const updatedGrades = { ...prevGrades };
            const level = year.grade_level;

            if (updatedGrades[level]) {
              updatedGrades[level] = updatedGrades[level].map(grade => {
                const dbConfig = data.find(d => d.subject_name === grade.subject_name);
                if (dbConfig) {
                  return {
                    ...grade,
                    workload: dbConfig.workload.toString(),
                  };
                }
                return grade;
              });
            }

            return updatedGrades;
          });
        }
      }
    } catch (error: any) {
      console.error("Error updating workloads from database:", error);
    }
  };

  useEffect(() => {
    updateWorkloadsFromDatabase();

    const channel = supabase
      .channel('workload-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workload_configurations'
        },
        () => {
          updateWorkloadsFromDatabase();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [academicYears]);

  const loadTranscriptData = async () => {
    try {
      setLoadingData(true);
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("*")
        .eq("id", id)
        .single();

      if (studentError) throw studentError;

      setStudentData({
        full_name: student.full_name || "",
        mother_name: student.mother_name || "",
        father_name: student.father_name || "",
        birth_date: student.birth_date || "",
        birth_place: student.birth_place || "",
        birth_state: student.birth_state || "BA",
        student_status: student.student_status || "cursando",
        grade_series: student.grade_series || "",
        observations: student.observations || "",
      });

      // Set selectedSchoolId from loaded student data.
      // This will trigger the combined useEffect (step 3) to re-evaluate.
      setSelectedSchoolId(student.school_id); 
      console.log("loadTranscriptData: student.school_id set to", student.school_id);

      const { data: yearsData, error: yearsError } = await supabase
        .from("academic_years")
        .select("*")
        .eq("student_id", id)
        .order("calendar_year");

      if (yearsError) throw yearsError;

      if (yearsData && yearsData.length > 0) {
        setAcademicYears(
          yearsData.map((year) => ({
            calendar_year: year.calendar_year,
            grade_level: year.grade_level,
            school_name: year.school_name,
            city: year.city,
            state: year.state,
            shift: year.shift || "",
            class_name: year.class_name || "",
            reclassified: year.reclassified || false,
            school_period_start: year.school_period_start,
            school_period_end: year.school_period_end,
            trimester_year: year.trimester_year,
            trimester_shift: year.trimester_shift,
          }))
        );

        const loadedYearGrades: { [key: string]: Grade[] } = {};
        for (const year of yearsData) {
          const { data: gradesData, error: gradesError } = await supabase
            .from("annual_grades")
            .select("*")
            .eq("academic_year_id", year.id);

          if (gradesError) throw gradesError;

          if (gradesData && gradesData.length > 0) {
            loadedYearGrades[year.grade_level] = gradesData.map((g) => ({
              subject_name: g.subject_name,
              grade: g.grade?.toString() || "",
              workload: g.workload?.toString() || "",
              absences: g.absences?.toString() || "0",
            }));
          }
        }

        GRADE_LEVELS.forEach((level) => {
          if (!loadedYearGrades[level]) {
            const workloadData = WORKLOAD_BY_GRADE[level] || {};
            loadedYearGrades[level] = SUBJECTS.map((subject) => ({
              subject_name: subject,
              grade: "",
              workload: workloadData[subject]?.toString() || "",
              absences: "0",
            }));
          }
        });

        setYearGrades(loadedYearGrades);

        const latestYear = yearsData[yearsData.length - 1];
        if (latestYear) {
          setLatestAcademicYearId(latestYear.id);
          setSchoolPeriod({
            startDate: latestYear.school_period_start || "",
            endDate: latestYear.school_period_end || "",
            gradeClass: latestYear.trimester_year || "",
            shift: latestYear.trimester_shift || "",
          });
        }

        const { data: trimesterData, error: trimesterError } = await supabase
          .from("trimester_grades")
          .select("*")
          .in("academic_year_id", yearsData.map((y) => y.id));

        if (trimesterError) throw trimesterError;

        if (trimesterData && trimesterData.length > 0) {
          setTrimesterGrades(
            trimesterData.map((t) => ({
              subject_name: t.subject_name,
              trimester: t.trimester,
              grade: t.grade?.toString() || "",
              absences: t.absences?.toString() || "0",
            }))
          );
        }
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível carregar os dados",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleSave = async () => {
    try {
      studentSchema.parse(studentData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Erro de validação",
          description: error.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    if (!selectedSchoolId) {
      toast({
        title: "Erro",
        description: "Selecione uma escola para o aluno.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let studentId = id;
      let currentSchoolId = selectedSchoolId;
      let currentMunicipalityId: string | null = null;

      // Fetch municipality_id for the selected school
      const { data: schoolDetails, error: schoolError } = await supabase
        .from('schools')
        .select('municipality_id')
        .eq('id', currentSchoolId)
        .single();

      if (schoolError) throw schoolError;
      currentMunicipalityId = schoolDetails?.municipality_id || null;
      if (!currentMunicipalityId) throw new Error("Não foi possível determinar a rede municipal da escola selecionada.");


      if (id) {
        // Update existing student
        const { error: studentError } = await supabase
          .from("students")
          .update({ ...studentData, school_id: currentSchoolId })
          .eq("id", id);

        if (studentError) throw studentError;

        // --- CORREÇÃO: Excluir dados relacionados na ordem correta ---
        // 1. Obter todos os IDs dos anos letivos associados a este aluno
        const { data: existingAcademicYears, error: fetchYearsError } = await supabase
          .from("academic_years")
          .select("id")
          .eq("student_id", id);

        if (fetchYearsError) throw fetchYearsError;
        const existingAcademicYearIds = existingAcademicYears?.map(y => y.id) || [];

        if (existingAcademicYearIds.length > 0) {
          // 2. Excluir notas trimestrais associadas a esses anos letivos
          const { error: deleteTrimesterError } = await supabase
            .from("trimester_grades")
            .delete()
            .in("academic_year_id", existingAcademicYearIds);
          if (deleteTrimesterError) throw deleteTrimesterError;

          // 3. Excluir notas anuais associadas a esses anos letivos
          const { error: deleteAnnualError } = await supabase
            .from("annual_grades")
            .delete()
            .in("academic_year_id", existingAcademicYearIds);
          if (deleteAnnualError) throw deleteAnnualError;
        }

        // 4. Finalmente, excluir os próprios anos letivos
        const { error: deleteYearsError } = await supabase
          .from("academic_years")
          .delete()
          .eq("student_id", id);
        if (deleteYearsError) throw deleteYearsError;
        // --- FIM DA CORREÇÃO ---

      } else {
        // Insert new student
        const { data: student, error: studentError } = await supabase
          .from("students")
          .insert([{ ...studentData, school_id: currentSchoolId }])
          .select()
          .single();

        if (studentError) throw studentError;
        studentId = student.id;
      }

      // Insert academic years and grades
      for (let i = 0; i < academicYears.length; i++) {
        const year = academicYears[i];
        const isLatestYear = i === academicYears.length - 1;

        const yearData = isLatestYear ? {
          ...year,
          student_id: studentId,
          school_period_start: schoolPeriod.startDate,
          school_period_end: schoolPeriod.endDate,
          trimester_year: schoolPeriod.gradeClass,
          trimester_shift: schoolPeriod.shift,
        } : {
          ...year,
          student_id: studentId,
        };

        const { data: academicYear, error: yearError } = await supabase
          .from("academic_years")
          .insert([yearData])
          .select()
          .single();

        if (yearError) throw yearError;

        const gradesForYear = yearGrades[year.grade_level] || [];
        const gradesToInsert = gradesForYear
          .filter((g) => g.grade || g.workload || parseInt(g.absences) > 0)
          .map((g) => ({
            student_id: studentId,
            academic_year_id: academicYear.id,
            subject_name: g.subject_name,
            grade: g.grade ? parseFloat(g.grade) : null,
            workload: g.workload ? parseInt(g.workload) : null,
            absences: parseInt(g.absences) || 0,
          }));

        if (gradesToInsert.length > 0) {
          const { error: gradesError } = await supabase
            .from("annual_grades")
            .insert(gradesToInsert);

          if (gradesError) throw gradesError;
        }

        if (isLatestYear && studentData.student_status === "cursando") {
          const trimesterGradesToInsert = trimesterGrades
            .filter((g) => g.grade || parseInt(g.absences) > 0)
            .map((g) => ({
              academic_year_id: academicYear.id,
              subject_name: g.subject_name,
              trimester: g.trimester,
              grade: g.grade ? parseFloat(g.grade) : null,
              absences: parseInt(g.absences) || 0,
            }));

          if (trimesterGradesToInsert.length > 0) {
            const { error: trimesterError } = await supabase
              .from("trimester_grades")
              .insert(trimesterGradesToInsert);

            if (trimesterError) throw trimesterError;
          }
        }
      }

      // Prepare data for hashing and signing
      const dataToHash = {
        studentData,
        academicYears,
        yearGrades,
        trimesterGrades,
        schoolPeriod,
        schoolId: currentSchoolId,
        municipalityId: currentMunicipalityId,
        // REMOVIDO: creator field para garantir consistência do hash
      };
      // No hash generated here, as it's done at the time of signing by the secretary.

      // Insert or update transcript entry
      let transcriptRecordId: string;
      
      // Always clear signature fields when saving from CreateTranscript,
      // as this is the start of a new signing cycle or a re-draft.
      const transcriptUpdatePayload = {
        student_id: studentId,
        school_id: currentSchoolId,
        municipality_id: currentMunicipalityId,
        status: 'pending_secretary_signature', // Always set to pending_secretary_signature
        document_hash: null, // Clear hash
        data: dataToHash, // Store current data as the editable version
        signed_data: null, // Clear signed data
        director_signature_id: null,
        director_signed_at: null,
        secretary_signature_id: null,
        secretary_signed_at: null,
      };

      if (id) {
        // Check if a transcript record already exists for this student
        const { data: existingTranscript, error: fetchTranscriptError } = await supabase
          .from('transcripts')
          .select('id')
          .eq('student_id', id)
          .single();

        if (fetchTranscriptError && fetchTranscriptError.code !== 'PGRST116') { // PGRST116 means "no rows found"
          throw fetchTranscriptError;
        }

        if (existingTranscript) {
          transcriptRecordId = existingTranscript.id;
          // Update existing transcript
          const { error: transcriptUpdateError } = await supabase
            .from('transcripts')
            .update(transcriptUpdatePayload)
            .eq('id', transcriptRecordId);
          if (transcriptUpdateError) throw transcriptUpdateError;
        } else {
          // If student exists but no transcript record, insert new transcript
          const { data: newTranscript, error: transcriptInsertError } = await supabase
            .from('transcripts')
            .insert([transcriptUpdatePayload])
            .select('id')
            .single();
          if (transcriptInsertError) throw transcriptInsertError;
          transcriptRecordId = newTranscript.id;
        }
      } else {
        // Insert new student and new transcript
        const { data: newTranscript, error: transcriptInsertError } = await supabase
          .from('transcripts')
          .insert([transcriptUpdatePayload])
          .select('id')
          .single();
        if (transcriptInsertError) throw transcriptInsertError;
        transcriptRecordId = newTranscript.id;
      }

      // Create notification for the school's secretary using an Edge Function
      const { data: secretaryProfiles, error: secretaryError } = await supabase
        .from('profiles')
        .select('id')
        .eq('school_id', currentSchoolId)
        .eq('role', 'secretary');

      if (secretaryError) console.error('Client: Error fetching secretary for notification:', secretaryError);

      if (secretaryProfiles && secretaryProfiles.length > 0) {
        for (const secretary of secretaryProfiles) {
          console.log(`Client: Invoking create-notification for secretary ${secretary.id} for student ${studentData.full_name}`);
          const { data: notificationResponse, error: notificationError } = await supabase.functions.invoke('create-notification', {
            body: JSON.stringify({
              user_id: secretary.id,
              type: 'transcript_pending_signature',
              target_id: transcriptRecordId,
              message: `Novo histórico de ${studentData.full_name} aguardando sua assinatura como Secretário(a).`,
            }),
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (notificationError) {
            console.error('Client: Error invoking create-notification edge function for secretary:', notificationError);
            toast({
              title: "Erro na notificação",
              description: notificationError.message || "Não foi possível enviar a notificação para o secretário.",
              variant: "destructive",
            });
          } else if (notificationResponse && notificationResponse.error) {
            console.error('Client: Edge function returned error for secretary notification:', notificationResponse.error);
            toast({
              title: "Erro na notificação",
              description: notificationResponse.error || "Não foi possível enviar a notificação para o secretário.",
              variant: "destructive",
            });
          } else {
            console.log('Client: Notification edge function invoked successfully for secretary:', notificationResponse);
          }
        }
      }

      toast({
        title: "Sucesso",
        description: id ? "Histórico escolar atualizado e enviado para assinatura do Secretário(a)." : "Histórico escolar criado e enviado para assinatura do Secretário(a).",
      });

      navigate(`/visualizar/${studentId}`);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar o histórico",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card shadow-school">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to="/"> {/* Adicionado Link aqui */}
              <img src={correctLogo} alt="Correct Logo" className="h-16 w-16" />
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-primary">
                {id ? "Editar Histórico Escolar" : "Novo Histórico Escolar"}
              </h1>
              <p className="text-muted-foreground">Preencha os dados do aluno</p>
            </div>
            <Link to="/lista-alunos">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="student" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="student">Dados do Aluno</TabsTrigger>
            <TabsTrigger value="years">Anos Letivos</TabsTrigger>
            <TabsTrigger value="grades">Notas Anuais</TabsTrigger>
            <TabsTrigger value="trimester">Notas Trimestrais</TabsTrigger>
            <TabsTrigger value="observations">Observações</TabsTrigger>
          </TabsList>
          <TabsContent value="student">
            <Card>
              <CardHeader>
                <CardTitle>Informações do Aluno</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nome Completo *</Label>
                  <Input
                    id="full_name"
                    value={studentData.full_name}
                    onChange={(e) => setStudentData({ ...studentData, full_name: e.target.value })}
                    placeholder="Nome completo do aluno"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="mother_name">Nome da Mãe *</Label>
                    <Input
                      id="mother_name"
                      value={studentData.mother_name}
                      onChange={(e) => setStudentData({ ...studentData, mother_name: e.target.value })}
                      placeholder="Nome completo da mãe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="father_name">Nome do Pai</Label>
                    <Input
                      id="father_name"
                      value={studentData.father_name}
                      onChange={(e) => setStudentData({ ...studentData, father_name: e.target.value })}
                      placeholder="Nome completo do pai"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birth_date">Data de Nascimento *</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={studentData.birth_date}
                    onChange={(e) => setStudentData({ ...studentData, birth_date: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="birth_place">Naturalidade (Cidade) *</Label>
                    <Input
                      id="birth_place"
                      value={studentData.birth_place}
                      onChange={(e) => setStudentData({ ...studentData, birth_place: e.target.value })}
                      placeholder="Nome da cidade"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birth_state">Estado (UF) *</Label>
                    <select
                      id="birth_state"
                      value={studentData.birth_state}
                      onChange={(e) => setStudentData({ ...studentData, birth_state: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="AC">AC</option>
                      <option value="AL">AL</option>
                      <option value="AP">AP</option>
                      <option value="AM">AM</option>
                      <option value="BA">BA</option>
                      <option value="CE">CE</option>
                      <option value="DF">DF</option>
                      <option value="ES">ES</option>
                      <option value="GO">GO</option>
                      <option value="MA">MA</option>
                      <option value="MT">MT</option>
                      <option value="MS">MS</option>
                      <option value="MG">MG</option>
                      <option value="PA">PA</option>
                      <option value="PB">PB</option>
                      <option value="PR">PR</option>
                      <option value="PE">PE</option>
                      <option value="PI">PI</option>
                      <option value="RJ">RJ</option>
                      <option value="RN">RN</option>
                      <option value="RS">RS</option>
                      <option value="RO">RO</option>
                      <option value="RR">RR</option>
                      <option value="SC">SC</option>
                      <option value="SP">SP</option>
                      <option value="SE">SE</option>
                      <option value="TO">TO</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="student_status">Status do Aluno (Geral)</Label>
                    <select
                      id="student_status"
                      value={studentData.student_status}
                      onChange={(e) => setStudentData({ ...studentData, student_status: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {STUDENT_STATUS_OPTIONS.map(status => (
                        <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Este status é para o aluno em geral.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="grade_series">Séries Cursadas</Label>
                    <select
                      id="grade_series"
                      value={studentData.grade_series}
                      onChange={(e) => setStudentData({ ...studentData, grade_series: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Selecione</option>
                      <option value="1º ao 5º ano">1º ao 5º ano</option>
                      <option value="1º ao 4º ano">1º ao 4º ano</option>
                      <option value="1º ao 3º ano">1º ao 3º ano</option>
                      <option value="1º ao 2º ano">1º ao 2º ano</option>
                      <option value="1º ano">1º ano</option>
                      <option value="2º ao 5º ano">2º ao 5º ano</option>
                      <option value="2º ao 4º ano">2º ao 4º ano</option>
                      <option value="2º ao 3º ano">2º ao 3º ano</option>
                      <option value="2º ano">2º ano</option>
                      <option value="3º ao 5º ano">3º ao 5º ano</option>
                      <option value="3º ao 4º ano">3º ao 4º ano</option>
                      <option value="3º ano">3º ano</option>
                      <option value="4º ao 5º ano">4º ao 5º ano</option>
                      <option value="4º ano">4º ano</option>
                      <option value="5º ano">5º ano</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school_id">Escola *</Label>
                  <Select
                    value={selectedSchoolId || ""}
                    onValueChange={(value) => {
                      setSelectedSchoolId(value);
                    }}
                    disabled={!!profile?.school_id && (['school_admin', 'vice_school_admin', 'secretary', 'administrative_assistant'].includes(role || ''))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a escola" />
                    </SelectTrigger>
                    <SelectContent>
                      {schools.map((school) => (
                        <SelectItem key={school.id} value={school.id}>
                          {school.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="years">
            <AcademicYearsTable
              academicYears={academicYears}
              setAcademicYears={setAcademicYears}
              gradeLevels={GRADE_LEVELS}
              schools={schools} // Passando schools
              selectedSchoolId={selectedSchoolId} // Passando selectedSchoolId
            />
          </TabsContent>
          <TabsContent value="grades">
            <Card>
              <CardHeader>
                <CardTitle>Notas Anuais por Série</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={GRADE_LEVELS[0]}>
                  <TabsList className="mb-4 grid w-full grid-cols-5">
                    {GRADE_LEVELS.map((level) => (
                      <TabsTrigger key={level} value={level}>
                        {level}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {GRADE_LEVELS.map((level) => (
                    <TabsContent key={level} value={level}>
                      <GradesTable
                        gradeLevel={level}
                        grades={yearGrades[level] || []}
                        setGrades={(grades) => setYearGrades({ ...yearGrades, [level]: grades })}
                        customSubjects={customSubjects[level]}
                        setCustomSubjects={(subjects) => setCustomSubjects({ ...customSubjects, [level]: subjects })}
                      />
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="trimester">
            <TrimesterGradesTable
              subjects={SUBJECTS}
              trimesterGrades={trimesterGrades}
              setTrimesterGrades={setTrimesterGrades}
              schoolPeriod={schoolPeriod}
              setSchoolPeriod={setSchoolPeriod}
            />
          </TabsContent>
          <TabsContent value="observations">
            <Card>
              <CardHeader>
                <CardTitle>Observações Complementares</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Observação padrão:
                  </p>
                  <p className="mt-2 text-sm">
                    A partir de 2007 a Rede Municipal de Ensino adotou o Ensino Fundamental de 9 anos.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="observations">Observações Adicionais</Label>
                  <Textarea
                    id="observations"
                    value={studentData.observations}
                    onChange={(e) => setStudentData({ ...studentData, observations: e.target.value })}
                    placeholder="Digite aqui informações complementares sobre o histórico escolar do aluno..."
                    className="min-h-[150px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Essas observações aparecerão no histórico escolar após a observação padrão.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} disabled={loading} size="lg">
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Salvando..." : "Salvar Histórico"}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default CreateTranscript;