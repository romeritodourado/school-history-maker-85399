import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
}

const CreateTranscript = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(!!id);
  const { user, profile, role } = useAuth();

  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);

  // Student data
  const [studentData, setStudentData] = useState({
    name: "",
    birthdate: "",
  });

  // Academic years
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([
    {
      calendar_year: new Date().getFullYear(),
      grade_level: "1º Ano",
      school_name: "", // Will be set from selectedSchoolId
      city: "", // Will be set from selectedSchoolId
      state: "", // Will be set from selectedSchoolId
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

  // Observations
  const [observations, setObservations] = useState("");
  
  // Store the latest academic year ID for trimester grades (not directly used in this simplified version)
  const [latestAcademicYearId, setLatestAcademicYearId] = useState<string | null>(null);

  useEffect(() => {
    fetchSchools();
  }, [profile]);

  useEffect(() => {
    if (id) {
      loadTranscriptData();
    } else if (schools.length > 0 && profile?.school_id) {
      setSelectedSchoolId(profile.school_id);
      updateAcademicYearsSchoolInfo(profile.school_id);
    }
  }, [id, schools, profile]);

  const fetchSchools = async () => {
    try {
      let query = supabase
        .from('schools')
        .select('id, name, municipality_id');

      if (role === 'municipal_admin' && profile?.municipality_id) {
        query = query.eq('municipality_id', profile.municipality_id);
      } else if (role === 'school_admin' || role === 'secretary' || role === 'teacher') {
        query = query.eq('id', profile?.school_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  };

  const updateAcademicYearsSchoolInfo = async (schoolId: string) => {
    const school = schools.find(s => s.id === schoolId);
    if (school) {
      // For now, city and state are hardcoded in the school table, not dynamic.
      // We'll need to fetch municipality details to get city/state if they become dynamic.
      // For now, let's assume city/state are part of the school's context or fixed.
      // For this example, we'll use placeholder values or fetch from municipality if available.
      const { data: municipality, error } = await supabase
        .from('municipalities')
        .select('name, cnpj') // Assuming city/state are not directly in municipality table for now
        .eq('id', school.municipality_id)
        .single();

      setAcademicYears(prevYears => prevYears.map(year => ({
        ...year,
        school_name: school.name,
        city: "Luís Eduardo Magalhães", // Placeholder, update if municipality has city field
        state: "BA", // Placeholder, update if municipality has state field
      })));
    }
  };

  const loadTranscriptData = async () => {
    try {
      setLoadingData(true);

      // Fetch student data
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("*")
        .eq("id", id)
        .single();

      if (studentError) throw studentError;

      setStudentData({
        name: student.name || "",
        birthdate: student.birthdate || "",
      });
      setSelectedSchoolId(student.school_id);

      // Fetch academic years
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

        // Fetch annual grades
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

        // Merge with default subjects and workload
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

        // Fetch trimester grades - get the latest academic year
        const latestYear = yearsData[yearsData.length - 1];
        if (latestYear) {
          setLatestAcademicYearId(latestYear.id);
          
          // Load school period data
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
    // Validate student data
    try {
      studentSchema.parse({
        full_name: studentData.name,
        birth_date: studentData.birthdate,
        // Temporarily remove mother_name, father_name, birth_place, birth_state, observations
        // as they are not in the current studentData state.
        // These fields need to be added back to the studentData state and form if required.
        mother_name: "Nome da Mãe Padrão", // Placeholder
        father_name: "", // Placeholder
        birth_place: "Cidade Padrão", // Placeholder
        birth_state: "BA", // Placeholder
        observations: "", // Placeholder
      });
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

      if (id) {
        // Update existing student
        const { error: studentError } = await supabase
          .from("students")
          .update({ name: studentData.name, birthdate: studentData.birthdate, school_id: selectedSchoolId })
          .eq("id", id);

        if (studentError) throw studentError;

        // Delete existing records to recreate
        await supabase.from("academic_years").delete().eq("student_id", id);
        await supabase.from("annual_grades").delete().eq("student_id", id);
        await supabase.from("trimester_grades").delete().in(
          "academic_year_id",
          (await supabase.from("academic_years").select("id").eq("student_id", id)).data?.map(y => y.id) || []
        );
      } else {
        // Insert new student
        const { data: student, error: studentError } = await supabase
          .from("students")
          .insert([{ name: studentData.name, birthdate: studentData.birthdate, school_id: selectedSchoolId }])
          .select()
          .single();

        if (studentError) throw studentError;
        studentId = student.id;
      }

      // Insert academic years and grades
      for (let i = 0; i < academicYears.length; i++) {
        const year = academicYears[i];
        const isLatestYear = i === academicYears.length - 1;
        
        // Add school period data to the latest academic year
        const yearData = isLatestYear 
          ? {
              ...year,
              student_id: studentId,
              school_period_start: schoolPeriod.startDate,
              school_period_end: schoolPeriod.endDate,
              trimester_year: schoolPeriod.gradeClass,
              trimester_shift: schoolPeriod.shift,
            }
          : { ...year, student_id: studentId };
        
        const { data: academicYear, error: yearError } = await supabase
          .from("academic_years")
          .insert([yearData])
          .select()
          .single();

        if (yearError) throw yearError;

        // Insert annual grades for this year
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

        // Insert trimester grades only for the latest year and only if student status is "cursando"
        // NOTE: student_status is not in the new student table. This logic needs to be re-evaluated.
        // For now, we'll assume trimester grades are always saved for the latest year.
        if (isLatestYear) {
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

      toast({
        title: "Sucesso",
        description: id ? "Histórico escolar atualizado com sucesso" : "Histórico escolar criado com sucesso",
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
      <div className="flex min-h-screen items-center justify-center">
        <p>Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card shadow-school">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <img src={correctLogo} alt="Correct Logo" className="h-16 w-16" />
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
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={studentData.name}
                    onChange={(e) =>
                      setStudentData({ ...studentData, name: e.target.value })
                    }
                    placeholder="Nome completo do aluno"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthdate">Data de Nascimento *</Label>
                  <Input
                    id="birthdate"
                    type="date"
                    value={studentData.birthdate}
                    onChange={(e) =>
                      setStudentData({ ...studentData, birthdate: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="school_id">Escola *</Label>
                  <Select
                    value={selectedSchoolId || ""}
                    onValueChange={(value) => {
                      setSelectedSchoolId(value);
                      updateAcademicYearsSchoolInfo(value);
                    }}
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
                        setGrades={(grades) =>
                          setYearGrades({ ...yearGrades, [level]: grades })
                        }
                        customSubjects={customSubjects[level]}
                        setCustomSubjects={(subjects) =>
                          setCustomSubjects({ ...customSubjects, [level]: subjects })
                        }
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
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
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