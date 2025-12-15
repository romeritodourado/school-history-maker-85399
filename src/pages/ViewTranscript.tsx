import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TranscriptPreview } from "@/components/transcript/TranscriptPreview";
import { exportToPDF, exportToExcel } from "@/lib/exportUtils";
import { useAuth } from '@/contexts/AuthContext'; // Importar useAuth

type AppRole = 'super_admin' | 'municipal_secretary' | 'network_manager' | 'school_admin' | 'secretary' | 'teacher' | 'vice_school_admin' | 'administrative_assistant';

interface StudentData {
  id: string;
  full_name: string; // Changed from name
  mother_name: string;
  father_name: string | null;
  birth_date: string; // Changed from birthdate
  birth_place: string;
  birth_state: string;
  student_status: string | null;
  grade_series: string | null;
  observations: string | null;
  school_id: string | null;
  schools: { 
    name: string, 
    municipality_id: string,
    address: string | null, 
    city: string | null, 
    state: string | null, 
    logo_url: string | null, 
    authorization_decree_url: string | null, 
    official_gazette_url: string | null,
    municipalities: { // Add this nested object
      name: string;
      emblem_url: string | null;
    } | null;
  } | null;
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
  school_period_start?: string | null;
  school_period_end?: string | null;
  trimester_year?: string | null;
  trimester_shift?: string | null;
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

interface ProfileData {
  id: string;
  name: string | null;
  registration_number: string | null;
  role: string;
  signature_image_url: string | null; // Adicionado
  cpf: string | null; // NOVO
}

interface HistoricalSignerData { // NOVO: Interface para dados históricos do signatário
  name: string | null;
  registration_number: string | null;
  cpf: string | null;
}

const ViewTranscript = () => {
  const { id: studentId } = useParams(); // Renomeado para studentId
  const { toast } = useToast();
  const { role: currentUserRole, profile: currentUserProfile } = useAuth(); // Usar useAuth
  const [loading, setLoading] = useState(true);
  const [transcriptId, setTranscriptId] = useState<string | null>(null); // Novo estado para o ID do transcript
  const [transcriptStatus, setTranscriptStatus] = useState<string | null>(null); // NOVO: Status do histórico
  const [student, setStudent] = useState<StudentData | null>(null);
  const [academicYears, setAcademicYears] = useState<AcademicYearData[]>([]);
  const [grades, setGrades] = useState<{ [yearId: string]: GradeData[] }>({});
  const [trimesterGrades, setTrimesterGrades] = useState<TrimesterGradeData[]>([]);
  const [schoolPeriod, setSchoolPeriod] = useState<{ startDate: string; endDate: string; gradeClass: string; shift: string } | undefined>();
  const [directorProfile, setDirectorProfile] = useState<ProfileData | null>(null); // Novo estado
  const [secretaryProfile, setSecretaryProfile] = useState<ProfileData | null>(null); // Novo estado
  const [historicalDirectorData, setHistoricalDirectorData] = useState<HistoricalSignerData | null>(null); // NOVO
  const [historicalSecretaryData, setHistoricalSecretaryData] = useState<HistoricalSignerData | null>(null); // NOVO
  const [directorSignedAt, setDirectorSignedAt] = useState<string | null>(null); // NOVO: Data e hora da assinatura do diretor
  const [secretarySignedAt, setSecretarySignedAt] = useState<string | null>(null); // NOVO: Data e hora da assinatura do secretário
  const [documentHash, setDocumentHash] = useState<string | null>(null); // CORRIGIDO: Inicializado com null

  useEffect(() => {
    if (studentId) {
      fetchTranscript();
    }
  }, [studentId]);

  const fetchTranscript = async () => {
    try {
      setLoading(true);
      // Fetch the transcript record to get its ID and signature IDs
      const { data: transcriptRecord, error: transcriptRecordError } = await supabase
        .from('transcripts')
        .select('id, student_id, school_id, municipality_id, status, data, signed_data, director_signature_id, secretary_signature_id, director_signed_at, secretary_signed_at, document_hash')
        .eq('student_id', studentId)
        .single();

      if (transcriptRecordError) throw transcriptRecordError;
      if (!transcriptRecord) throw new Error("Histórico não encontrado para este aluno.");

      setTranscriptId(transcriptRecord.id);
      setTranscriptStatus(transcriptRecord.status);
      setDirectorSignedAt(transcriptRecord.director_signed_at);
      setSecretarySignedAt(transcriptRecord.secretary_signed_at);
      setDocumentHash(transcriptRecord.document_hash);

      // Determine which data to use: signed_data if status is 'signed', otherwise 'data'
      const displayData = transcriptRecord.status === 'signed' && transcriptRecord.signed_data 
        ? transcriptRecord.signed_data 
        : transcriptRecord.data;

      if (!displayData) throw new Error("Dados do histórico estão vazios.");

      // Extract student data from displayData
      const studentDataFromTranscript = displayData.studentData;
      const academicYearsFromTranscript = displayData.academicYears;
      const yearGradesFromTranscript = displayData.yearGrades;
      const trimesterGradesFromTranscript = displayData.trimesterGrades; // CORRIGIDO AQUI
      const schoolPeriodFromTranscript = displayData.schoolPeriod;

      // Extract historical signer data from displayData
      setHistoricalDirectorData(displayData.director || null);
      setHistoricalSecretaryData(displayData.secretary || null);

      // Fetch student details (full_name, mother_name, etc.)
      const { data: studentDetails, error: studentDetailsError } = await supabase
        .from("students")
        .select(`
          *,
          schools (
            name, 
            municipality_id,
            address,
            city,
            state,
            logo_url,
            authorization_decree_url,
            official_gazette_url,
            municipalities (name, emblem_url)
          )
        `)
        .eq("id", studentId)
        .single();

      if (studentDetailsError) throw studentDetailsError;
      
      // Combine fetched student details with data from transcript (which might be more up-to-date for some fields)
      const combinedStudentData: StudentData = {
        ...studentDetails,
        full_name: studentDataFromTranscript.full_name || studentDetails.full_name,
        mother_name: studentDataFromTranscript.mother_name || studentDetails.mother_name,
        father_name: studentDataFromTranscript.father_name || studentDetails.father_name,
        birth_date: studentDataFromTranscript.birth_date || studentDetails.birth_date,
        birth_place: studentDataFromTranscript.birth_place || studentDetails.birth_place,
        birth_state: studentDataFromTranscript.birth_state || studentDetails.birth_state,
        student_status: studentDataFromTranscript.student_status || studentDetails.student_status,
        grade_series: studentDataFromTranscript.grade_series || studentDetails.grade_series,
        observations: studentDataFromTranscript.observations || studentDetails.observations,
        school_id: studentDataFromTranscript.school_id || studentDetails.school_id,
        schools: studentDetails.schools, // Keep fetched school details
      };
      setStudent(combinedStudentData);

      setAcademicYears(academicYearsFromTranscript || []);
      setGrades(yearGradesFromTranscript || {});
      setTrimesterGrades(trimesterGradesFromTranscript || []);
      setSchoolPeriod(schoolPeriodFromTranscript || undefined);

      // Fetch director profile if ID exists
      let fetchedDirectorProfile: ProfileData | null = null;
      if (transcriptRecord.director_signature_id) {
        const { data: dirProfile, error: dirError } = await supabase
          .from('profiles')
          .select('id, name, registration_number, role, signature_image_url, cpf')
          .eq('id', transcriptRecord.director_signature_id)
          .single();
        
        // Tratamento de erro PGRST116 (No rows found)
        if (dirError && dirError.code !== 'PGRST116') {
          console.error('Error fetching director profile:', dirError);
          // Não lançar erro, apenas logar e continuar
        }
        fetchedDirectorProfile = dirProfile;
      }
      setDirectorProfile(fetchedDirectorProfile);

      // Fetch secretary profile if ID exists
      let fetchedSecretaryProfile: ProfileData | null = null;
      if (transcriptRecord.secretary_signature_id) {
        const { data: secProfile, error: secError } = await supabase
          .from('profiles')
          .select('id, name, registration_number, role, signature_image_url, cpf')
          .eq('id', transcriptRecord.secretary_signature_id)
          .single();
        
        // Tratamento de erro PGRST116 (No rows found)
        if (secError && secError.code !== 'PGRST116') {
          console.error('Error fetching secretary profile:', secError);
          // Não lançar erro, apenas logar e continuar
        }
        fetchedSecretaryProfile = secProfile;
      }
      setSecretaryProfile(fetchedSecretaryProfile);

    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível carregar o histórico",
        variant: "destructive",
      });
      setStudent(null); // Clear student data on error
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (student && academicYears.length > 0 && transcriptId) {
      try {
        await exportToPDF(
          student,
          academicYears,
          grades,
          trimesterGrades,
          schoolPeriod,
          transcriptId,
          directorProfile,
          secretaryProfile,
          historicalDirectorData, // NOVO
          historicalSecretaryData, // NOVO
          directorSignedAt,
          secretarySignedAt,
          documentHash,
          transcriptStatus // Pass transcriptStatus
        );
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
  
  const handleRevertToDraft = async () => {
    if (!transcriptId || !studentId) return;

    if (!confirm('Tem certeza que deseja reverter este histórico para o status de rascunho? Isso removerá todas as assinaturas digitais e o histórico voltará para a fila de assinatura do Secretário(a).')) {
      return;
    }

    try {
      setLoading(true);
      
      // 1. Fetch the current transcript data (the 'data' field)
      const { data: currentTranscript, error: fetchError } = await supabase
        .from('transcripts')
        .select('data')
        .eq('id', transcriptId)
        .single();

      if (fetchError) throw fetchError;
      if (!currentTranscript?.data) throw new Error("Dados originais do histórico não encontrados.");

      // 2. Update the transcript record
      const { error: updateError } = await supabase
        .from('transcripts')
        .update({
          status: 'pending_secretary_signature', // Reverte para o início do ciclo
          document_hash: null, // Limpa o hash
          signed_data: null, // Limpa os dados assinados
          director_signature_id: null,
          director_signed_at: null,
          secretary_signature_id: null,
          secretary_signed_at: null,
          // Mantém o campo 'data' original
        })
        .eq('id', transcriptId);

      if (updateError) throw updateError;

      toast({
        title: "Sucesso",
        description: "Histórico revertido para o status 'Pendente de Assinatura do Secretário(a)'.",
      });
      
      // 3. Re-fetch data to update the view
      await fetchTranscript();

    } catch (error: any) {
      toast({
        title: "Erro ao reverter",
        description: error.message || "Não foi possível reverter o histórico.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Determine if the current user has permission to revert
  const schoolLevelRoles = ['school_admin', 'vice_school_admin', 'secretary', 'administrative_assistant'];
  
  const canRevert = currentUserRole === 'super_admin' || 
                    currentUserRole === 'municipal_secretary' || 
                    (currentUserRole === 'network_manager' && currentUserProfile?.municipality_id === student?.schools?.municipality_id) ||
                    (schoolLevelRoles.includes(currentUserRole || '') && currentUserProfile?.school_id === student?.school_id);

  useEffect(() => {
    if (!loading && student) {
      console.log(`[ViewTranscript] Status: ${transcriptStatus}, Can Revert: ${canRevert}`);
    }
  }, [loading, student, transcriptStatus, canRevert]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-primary">Histórico Escolar</h1>
              <p className="text-muted-foreground">{student.full_name}</p>
            </div>
            <div className="flex gap-2">
              {canRevert && (transcriptStatus === 'signed' || transcriptStatus === 'rejected') && (
                <Button onClick={handleRevertToDraft} variant="destructive" size="sm">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reverter para Rascunho
                </Button>
              )}
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
          transcriptId={transcriptId} // Pass the transcriptId
          directorProfile={directorProfile}
          secretaryProfile={secretaryProfile}
          historicalDirectorData={historicalDirectorData} // NOVO
          historicalSecretaryData={historicalSecretaryData} // NOVO
          directorSignedAt={directorSignedAt} // NOVO
          secretarySignedAt={secretarySignedAt} // NOVO
          documentHash={documentHash} // NOVO
        />
      </main>
    </div>
  );
};

export default ViewTranscript;