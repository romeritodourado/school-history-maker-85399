import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import schoolLogo from "@/assets/school-logo.png";
import { TranscriptPreview } from "@/components/transcript/TranscriptPreview";
import { exportToPDF, exportToExcel } from "@/lib/exportUtils";

interface StudentData {
  id: string;
  full_name: string;
  mother_name: string;
  father_name: string;
  birth_date: string;
  birth_place: string;
  birth_state?: string;
  student_status?: string;
  grade_series?: string;
  observations?: string;
}

interface AcademicYearData {
  id: string;
  calendar_year: number;
  grade_level: string;
  school_name: string;
  city: string;
  state: string;
  shift: string;
  class_name: string;
  reclassified?: boolean;
}

interface GradeData {
  subject_name: string;
  grade: number | null;
  workload: number | null;
  absences: number;
}

interface TrimesterGradeData {
  subject_name: string;
  trimester: number;
  grade: number | null;
  absences: number;
}

const ViewTranscript = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentData | null>(null);
  const [academicYears, setAcademicYears] = useState<AcademicYearData[]>([]);
  const [grades, setGrades] = useState<{ [yearId: string]: GradeData[] }>({});
  const [trimesterGrades, setTrimesterGrades] = useState<TrimesterGradeData[]>([]);
  const [schoolPeriod, setSchoolPeriod] = useState<{ startDate: string; endDate: string; gradeClass: string; shift: string } | undefined>();

  useEffect(() => {
    if (id) {
      fetchTranscript();
    }
  }, [id]);

  const fetchTranscript = async () => {
    try {
      // Fetch student
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("*")
        .eq("id", id)
        .single();

      if (studentError) throw studentError;
      setStudent(studentData);

      // Fetch academic years
      const { data: yearsData, error: yearsError } = await supabase
        .from("academic_years")
        .select("*")
        .eq("student_id", id)
        .order("calendar_year");

      if (yearsError) throw yearsError;
      setAcademicYears(yearsData || []);

      // Fetch annual grades for each year
      const gradesMap: { [yearId: string]: GradeData[] } = {};
      for (const year of yearsData || []) {
        const { data: gradesData, error: gradesError } = await supabase
          .from("annual_grades")
          .select("subject_name, grade, workload, absences")
          .eq("academic_year_id", year.id);

        if (gradesError) throw gradesError;
        gradesMap[year.id] = gradesData || [];
      }
      setGrades(gradesMap);

      // Fetch trimester grades (for the most recent year)
      if (yearsData && yearsData.length > 0) {
        const latestYear = yearsData[yearsData.length - 1];
        
        // Load school period data
        setSchoolPeriod({
          startDate: (latestYear as any).school_period_start || "",
          endDate: (latestYear as any).school_period_end || "",
          gradeClass: (latestYear as any).trimester_year || "",
          shift: (latestYear as any).trimester_shift || "",
        });
        
        const { data: trimesterData, error: trimesterError } = await supabase
          .from("trimester_grades")
          .select("subject_name, trimester, grade, absences")
          .eq("academic_year_id", latestYear.id);

        if (trimesterError) throw trimesterError;
        setTrimesterGrades(trimesterData || []);
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível carregar o histórico",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (student && academicYears.length > 0) {
      try {
        await exportToPDF(student, academicYears, grades, trimesterGrades, schoolPeriod);
        toast({
          title: "Sucesso",
          description: "PDF gerado com sucesso",
        });
      } catch (error) {
        toast({
          title: "Erro",
          description: "Não foi possível gerar o PDF",
          variant: "destructive",
        });
      }
    }
  };

  const handleExportExcel = () => {
    if (student && academicYears.length > 0) {
      exportToExcel(student, academicYears, grades, trimesterGrades);
      toast({
        title: "Sucesso",
        description: "Arquivo Excel gerado com sucesso",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-muted-foreground">Histórico não encontrado</p>
          <Link to="/lista-alunos">
            <Button>Voltar</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card shadow-school">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <img src={schoolLogo} alt="Logo" className="h-16 w-16" />
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-primary">Histórico Escolar</h1>
              <p className="text-muted-foreground">{student.full_name}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleExportPDF} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
              <Button onClick={handleExportExcel} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar Excel
              </Button>
              <Link to="/lista-alunos">
                <Button variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <TranscriptPreview
          student={student}
          academicYears={academicYears}
          grades={grades}
          trimesterGrades={trimesterGrades}
          schoolPeriod={schoolPeriod}
        />
      </main>
    </div>
  );
};

export default ViewTranscript;
