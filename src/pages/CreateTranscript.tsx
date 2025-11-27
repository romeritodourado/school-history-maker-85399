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
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(!!id);
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
    student_status: "cursando",
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

  useEffect(() => {
    fetchSchools();
  }, [profile, role]);

  useEffect(() => {
    const schoolIdFromUrl = searchParams.get('schoolId');
    if (schoolIdFromUrl) {
      setSelectedSchoolId(schoolIdFromUrl);
    }

    if (id) {
      loadTranscriptData();
    } else if (schools.length > 0 && (schoolIdFromUrl || profile?.school_id)) {
      const initialSchool = schoolIdFromUrl || profile?.school_id;
      if (initialSchool) {
        setSelectedSchoolId(initialSchool);
        updateAcademicYearsSchoolInfo(initialSchool);
      }
    }
  }, [id, schools, profile, searchParams]);

  const fetchSchools = async () => {
    try {
      let query = supabase
        .from('schools')
        .select('id, name, municipality_id');

      if ((role === 'municipal_secretary' || role === 'network_manager') && profile?.municipality_id) {
        query = query.eq('municipality_id', profile.municipality_id);
      } else if (role === 'school_admin' || role === 'secretary' || role === 'assistente_administrativo') {
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
      const { data: municipality, error } = await supabase
        .from('municipalities')
        .select('name')
        .eq('id', school.municipality_id)
        .single();

      setAcademicYears(prevYears => prevYears.map(year => ({
        ...year,
        school_name: school.name,
        city: municipality?.name || "Luís Eduardo Magalhães", // Use municipality name for city
        state: "BA", // Assuming state is fixed for now
      })));
    }
  };

  const updateWorkloadsFromDatabase = async () => {
    try {
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
      setSelectedSchoolId(student.school_id);

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

      if (id) {
        const { error: studentError } = await supabase
          .from("students")
          .update({ ...studentData, school_id: selectedSchoolId })
          .eq("id", id);

        if (studentError) throw studentError;

        await supabase.from("academic_years").delete().eq("student_id", id);
        await supabase.from("annual_grades").delete().eq("student_id", id);
        
        const existingTrimesterYears = (await supabase.from("academic_years").select("id").eq("student_id", id)).data?.map(y => y.id) || [];
        if (existingTrimesterYears.length > 0) {
          await supabase.from("trimester_grades").delete().in("academic_year_id", existingTrimesterYears);
        }
      } else {
        const { data: student, error: studentError } = await supabase
          .from("students")
          .insert([{ ...studentData, school_id: selectedSchoolId }])
          .select()
          .single();

        if (studentError) throw studentError;
        studentId = student.id;
      }

      for (let i = 0; i < academicYears.length; i++) {
        const year = academicYears[i];
        const isLatestYear = i === academicYears.length - 1;
        
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
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando dados...</p>
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
                    onChange={(e) =>
                      setStudentData({ ...studentData, full_name: e.target.value })
                    }
                    placeholder="Nome completo do aluno"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="mother_name">Nome da Mãe *</Label>
                    <Input
                      id="mother_name"
                      value={studentData.mother_name}
                      onChange={(e) =>
                        setStudentData({ ...studentData, mother_name: e.target.value })
                      }
                      placeholder="Nome completo da mãe"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="father_name">Nome do Pai</Label>
                    <Input
                      id="father_name"
                      value={studentData.father_name}
                      onChange={(e) =>
                        setStudentData({ ...studentData, father_name: e.target.value })
                      }
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
                    onChange={(e) =>
                      setStudentData({ ...studentData, birth_date: e.target.value })
                    }
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="birth_place">Naturalidade (Cidade) *</Label>
                    <Input
                      id="birth_place"
                      value={studentData.birth_place}
                      onChange={(e) =>
                        setStudentData({ ...studentData, birth_place: e.target.value })
                      }
                      placeholder="Nome da cidade"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="birth_state">Estado (UF) *</Label>
                    <select
                      id="birth_state"
                      value={studentData.birth_state}
                      onChange={(e) =>
                        setStudentData({ ...studentData, birth_state: e.target.value })
                      }
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
                    <Label htmlFor="student_status">Status do Aluno *</Label>
                    <select
                      id="student_status"
                      value={studentData.student_status}
                      onChange={(e) => setStudentData({ ...studentData, student_status: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="cursando">Cursando</option>
                      <option value="transferido">Transferido</option>
                      <option value="concluído">Concluído</option>
                      <option value="conservado">Conservado</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="grade_series">Séries Cursadas</Label>
                    <select
                      id="grade_series"
                      value={studentData.grade_series}
                      onChange={(e) =>
                        setStudentData({ ...studentData, grade_series: e.target.value })
                      }
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