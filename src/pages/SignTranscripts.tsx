import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ArrowLeft, FileText, CheckCircle2, XCircle, Loader2, Signature, Eye } from 'lucide-react';
import correctLogo from "/correct-logo.png";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { TranscriptPreview } from '@/components/transcript/TranscriptPreview'; // Importar TranscriptPreview

interface StudentData {
  id: string;
  full_name: string;
  mother_name: string;
  father_name: string | null;
  birth_date: string;
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
    municipalities: {
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
}

interface TranscriptToSign {
  id: string;
  student_id: string;
  status: string;
  created_at: string;
  director_signature_id: string | null;
  secretary_signature_id: string | null;
  school_id: string; // ADICIONADO
  municipality_id: string; // ADICIONADO
  students: {
    full_name: string;
  } | null;
  schools: {
    name: string;
  } | null;
}

// Função para gerar o hash do conteúdo do histórico (duplicada para validação independente)
async function generateTranscriptHash(data: any): Promise<string> {
  const dataString = JSON.stringify(data);
  const textEncoder = new TextEncoder();
  const dataBuffer = textEncoder.encode(dataString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export default function SignTranscripts() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const schoolIdFromUrl = searchParams.get('schoolId');
  const { user, profile, role, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [pendingTranscripts, setPendingTranscripts] = useState<TranscriptToSign[]>([]);
  const [selectedTranscripts, setSelectedTranscripts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSigning, setIsSigning] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [currentAction, setCurrentAction] = useState<'sign' | 'reject' | null>(null);

  // State for preview dialog
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewTranscriptId, setPreviewTranscriptId] = useState<string | null>(null);
  const [previewStudent, setPreviewStudent] = useState<StudentData | null>(null);
  const [previewAcademicYears, setPreviewAcademicYears] = useState<AcademicYearData[]>([]);
  const [previewGrades, setPreviewGrades] = useState<{ [yearId: string]: GradeData[] }>({});
  const [previewTrimesterGrades, setPreviewTrimesterGrades] = useState<TrimesterGradeData[]>([]);
  const [previewSchoolPeriod, setPreviewSchoolPeriod] = useState<{ startDate: string; endDate: string; gradeClass: string; shift: string } | undefined>();
  const [previewDirectorProfile, setPreviewDirectorProfile] = useState<ProfileData | null>(null);
  const [previewSecretaryProfile, setPreviewSecretaryProfile] = useState<ProfileData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    console.log("SignTranscripts useEffect: Current User Role =", role);
    console.log("SignTranscripts useEffect: Profile School ID =", profile?.school_id);
    console.log("SignTranscripts useEffect: Profile Municipality ID =", profile?.municipality_id);
    console.log("SignTranscripts useEffect: School ID from URL =", schoolIdFromUrl);

    if (!authLoading && user && profile) {
      // Verificação mais robusta: o usuário deve ter um school_id para acessar esta página
      // Esta verificação é feita aqui e também na página de destino
      const isSchoolLevelUser = ['school_admin', 'secretary', 'administrative_assistant'].includes(profile.role || '');
      
      if (isSchoolLevelUser && !profile.school_id) {
        toast({
          title: 'Erro de Configuração do Perfil',
          description: `Seu perfil de ${profile.role} não está associado a uma escola. Por favor, entre em contato com o administrador do sistema para corrigir.`,
          variant: 'destructive',
          duration: 8000, // Make it last longer
        });
        setLoading(false); // Impede o carregamento e ações futuras
        // Redireciona para o dashboard ou outra página segura
        navigate('/');
        return; // IMPORTANT: return here to stop further execution
      }
      
      // Se for um usuário municipal, verificar municipality_id
      const isMunicipalLevelUser = ['municipal_secretary', 'network_manager'].includes(profile.role || '');
      if (isMunicipalLevelUser && !profile.municipality_id) {
        toast({
          title: 'Erro de Configuração do Perfil',
          description: `Seu perfil de ${profile.role} não está associado a uma rede municipal. Por favor, entre em contato com o administrador do sistema para corrigir.`,
          variant: 'destructive',
          duration: 8000,
        });
        setLoading(false);
        navigate('/');
        return;
      }
      
      // Se chegou aqui, o perfil parece estar OK para continuar
      // Mas ainda precisamos verificar se o schoolIdFromUrl é válido
      if (!schoolIdFromUrl) {
        toast({
          title: 'Erro',
          description: 'ID da escola não fornecido na URL. Redirecionando para o dashboard.',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }
      
      // Verificar se o usuário tem permissão para acessar esta escola
      // Esta verificação é feita no backend, mas podemos fazer uma verificação preliminar aqui
      if (isSchoolLevelUser && profile.school_id !== schoolIdFromUrl) {
        toast({
          title: 'Acesso negado',
          description: 'Você não tem permissão para acessar os históricos desta escola.',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }
      
      fetchPendingTranscripts();
    } else if (!authLoading && (!user || !profile)) {
      toast({
        title: 'Acesso negado',
        description: 'Você precisa estar logado para acessar esta página.',
        variant: 'destructive',
      });
      navigate('/login');
    }
  }, [authLoading, user, profile, schoolIdFromUrl, navigate, toast]);

  const fetchPendingTranscripts = async () => {
    setLoading(true);
    try {
      // O schoolIdFromUrl já foi verificado no useEffect
      let query = supabase
        .from('transcripts')
        .select(`
          id,
          student_id,
          status,
          created_at,
          director_signature_id,
          secretary_signature_id,
          school_id,
          municipality_id,
          data, // Fetch the full data content
          students (full_name),
          schools (name)
        `)
        .eq('school_id', schoolIdFromUrl) // Usar o schoolId da URL
        .order('created_at', { ascending: false });

      if (role === 'secretary') { // Changed role order
        query = query.eq('status', 'pending_secretary_signature');
      } else if (role === 'school_admin') { // Changed role order
        query = query.eq('status', 'pending_director_signature');
      } else {
        // Roles not authorized to sign
        setPendingTranscripts([]);
        setLoading(false);
        return;
      }

      const { data, error } = await query;
      if (error) throw error;

      setPendingTranscripts(data || []);
      setSelectedTranscripts([]); // Clear selections on data refresh
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      toast({
        title: 'Erro ao carregar históricos',
        description: error.message || 'Não foi possível carregar os históricos pendentes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTranscripts(pendingTranscripts.map(t => t.id));
    } else {
      setSelectedTranscripts([]);
    }
  };

  const handleSelectTranscript = (transcriptId: string, checked: boolean) => {
    if (checked) {
      setSelectedTranscripts(prev => [...prev, transcriptId]);
    } else {
      setSelectedTranscripts(prev => prev.filter(id => id !== transcriptId));
    }
  };

  const openConfirmationDialog = (action: 'sign' | 'reject') => {
    if (selectedTranscripts.length === 0) {
      toast({
        title: 'Nenhum histórico selecionado',
        description: 'Por favor, selecione pelo menos um histórico para ' + (action === 'sign' ? 'assinar.' : 'rejeitar.'),
        variant: 'default',
      });
      return;
    }
    setCurrentAction(action);
    setDialogOpen(true);
    setPassword('');
  };

  const fetchTranscriptForPreview = async (transcriptId: string) => {
    setLoadingPreview(true);
    try {
      // Fetch transcript data including signed_data and document_hash
      const { data: transcriptData, error: transcriptError } = await supabase
        .from('transcripts')
        .select(`
          id,
          student_id,
          school_id,
          municipality_id,
          document_hash,
          signed_data,
          director_signed_at,
          director_signature_id,
          secretary_signed_at,
          secretary_signature_id,
          students (full_name, mother_name, father_name, birth_date, birth_place, birth_state, student_status, grade_series, observations),
          schools (name, municipality_id, address, city, state, logo_url, authorization_decree_url, official_gazette_url, municipalities (name, emblem_url))
        `)
        .eq('id', transcriptId)
        .single();

      if (transcriptError) throw transcriptError;
      if (!transcriptData) throw new Error('Histórico não encontrado.');

      // NEW CHECK: Ensure student_id is present and valid
      const studentId = transcriptData.student_id;
      if (!studentId) {
        throw new Error('ID do aluno não encontrado no histórico. O histórico pode estar corrompido ou o aluno foi excluído.');
      }

      // Explicitly check for student and school data
      if (!transcriptData.students) {
        throw new Error('Dados do aluno não encontrados para este histórico. O aluno pode ter sido excluído ou há uma inconsistência nos dados.');
      }
      if (!transcriptData.schools) {
        throw new Error('Dados da escola não encontrados para este histórico. A escola pode ter sido excluída ou há uma inconsistência nos dados.');
      }

      const student: StudentData = {
        id: studentId, // Use the validated studentId
        full_name: (transcriptData.students as any).full_name,
        mother_name: (transcriptData.students as any).mother_name,
        father_name: (transcriptData.students as any).father_name,
        birth_date: (transcriptData.students as any).birth_date,
        birth_place: (transcriptData.students as any).birth_place,
        birth_state: (transcriptData.students as any).birth_state,
        student_status: (transcriptData.students as any).student_status,
        grade_series: (transcriptData.students as any).grade_series,
        observations: (transcriptData.students as any).observations,
        school_id: transcriptData.school_id, 
        schools: transcriptData.schools as StudentData['schools'], 
      };

      setPreviewTranscriptId(transcriptData.id);
      setPreviewStudent(student);

      // Fetch academic years
      const { data: yearsData, error: yearsError } = await supabase
        .from("academic_years")
        .select("*")
        .eq("student_id", student.id) 
        .order("calendar_year");

      if (yearsError) throw yearsError;
      setPreviewAcademicYears(yearsData || []);

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
      setPreviewGrades(gradesMap);

      // Fetch trimester grades (for the most recent year)
      if (yearsData && yearsData.length > 0) {
        const latestYear = yearsData[yearsData.length - 1];
        
        setPreviewSchoolPeriod({
          startDate: latestYear.school_period_start || "",
          endDate: latestYear.school_period_end || "",
          gradeClass: latestYear.trimester_year || "",
          shift: latestYear.trimester_shift || "",
        });
        
        const { data: trimesterData, error: trimesterError } = await supabase
          .from("trimester_grades")
          .select("subject_name, trimester, grade, absences")
          .eq("academic_year_id", latestYear.id); 

        if (trimesterError) throw trimesterError;
        setPreviewTrimesterGrades(trimesterData || []);
      }

      // Fetch director and secretary profiles if IDs exist
      let directorProfile: ProfileData | null = null;
      if (transcriptData.director_signature_id) {
        const { data: dirProfile, error: dirError } = await supabase
          .from('profiles')
          .select('id, name, registration_number, role')
          .eq('id', transcriptData.director_signature_id)
          .single();
        if (dirError) console.error('Error fetching director profile:', dirError);
        directorProfile = dirProfile;
      }
      setPreviewDirectorProfile(directorProfile);

      let secretaryProfile: ProfileData | null = null;
      if (transcriptData.secretary_signature_id) {
        const { data: secProfile, error: secError } = await supabase
          .from('profiles')
          .select('id, name, registration_number, role')
          .eq('id', transcriptData.secretary_signature_id)
          .single();
        if (secError) console.error('Error fetching secretary profile:', secError);
        secretaryProfile = secProfile;
      }
      setPreviewSecretaryProfile(secretaryProfile);

      setPreviewDialogOpen(true);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar pré-visualização',
        description: error.message || 'Não foi possível carregar os dados do histórico para pré-visualização.',
        variant: 'destructive',
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!user?.email || !password || !profile) {
      toast({
        title: 'Erro',
        description: 'Email, senha e perfil do usuário são obrigatórios para confirmar a ação.',
        variant: 'destructive',
      });
      return;
    }

    // --- VERIFICAÇÃO INICIAL DE CONFIGURAÇÃO DO PERFIL ---
    // Esta verificação já foi feita no useEffect, mas vamos repetir por segurança
    const isSchoolLevelUser = ['school_admin', 'secretary', 'administrative_assistant'].includes(profile.role || '');
    const isMunicipalLevelUser = ['municipal_secretary', 'network_manager'].includes(profile.role || '');
    
    if (isSchoolLevelUser && !profile.school_id) {
      toast({
        title: 'Erro de Configuração do Perfil',
        description: `Seu perfil de ${profile.role} não está associado a uma escola. Por favor, entre em contato com o administrador do sistema para corrigir.`,
        variant: 'destructive',
        duration: 8000,
      });
      return;
    }
    if (isMunicipalLevelUser && !profile.municipality_id) {
      toast({
        title: 'Erro de Configuração do Perfil',
        description: `Seu perfil de ${profile.role} não está associado a uma rede municipal. Por favor, entre em contato com o administrador do sistema para corrigir.`,
        variant: 'destructive',
        duration: 8000,
      });
      return;
    }
    // --- FIM DA VERIFICAÇÃO INICIAL ---

    setIsSigning(true);
    try {
      // Re-authenticate user to confirm action
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });

      if (authError) {
        throw new Error('Senha incorreta. Não foi possível confirmar a ação.');
      }

      const now = new Date().toISOString();
      const signerProfileData = {
        id: user.id,
        name: profile.name,
        registration_number: profile.registration_number,
        role: profile.role,
      };

      const updates = await Promise.all(selectedTranscripts.map(async transcriptId => {
        const transcript = pendingTranscripts.find(t => t.id === transcriptId);
        if (!transcript) return null;

        console.log(`[SignTranscripts] DEBUG: Processando histórico ${transcript.id}:`);
        console.log(`[SignTranscripts] DEBUG: User ID: ${user.id}`);
        console.log(`[SignTranscripts] DEBUG: Profile ID: ${profile.id}`);
        console.log(`[SignTranscripts] DEBUG: Profile Role: ${profile.role}`);
        
        const userSchoolId = profile.school_id;
        const transcriptSchoolId = transcript.school_id;
        const userMunicipalityId = profile.municipality_id;
        const transcriptMunicipalityId = transcript.municipality_id;

        console.log(`[SignTranscripts] DEBUG: User profile school_id (value): ${userSchoolId}, (type): ${typeof userSchoolId}, is null: ${userSchoolId === null}`);
        console.log(`[SignTranscripts] DEBUG: Transcript school_id (value): ${transcriptSchoolId}, (type): ${typeof transcriptSchoolId}, is null: ${transcriptSchoolId === null}`);
        console.log(`[SignTranscripts] DEBUG: Comparison (userSchoolId === transcriptSchoolId): ${userSchoolId === transcriptSchoolId}`);
        console.log(`[SignTranscripts] DEBUG: Comparison (userSchoolId !== transcriptSchoolId): ${userSchoolId !== transcriptSchoolId}`);

        console.log(`[SignTranscripts] DEBUG: User profile municipality_id (value): ${userMunicipalityId}, (type): ${typeof userMunicipalityId}, is null: ${userMunicipalityId === null}`);
        console.log(`[SignTranscripts] DEBUG: Transcript municipality_id (value): ${transcriptMunicipalityId}, (type): ${typeof transcriptMunicipalityId}, is null: ${transcriptMunicipalityId === null}`);
        console.log(`[SignTranscripts] DEBUG: Comparison (userMunicipalityId === transcriptMunicipalityId): ${userMunicipalityId === transcriptMunicipalityId}`);
        console.log(`[SignTranscripts] DEBUG: Comparison (userMunicipalityId !== transcriptMunicipalityId): ${userMunicipalityId !== transcriptMunicipalityId}`);

        console.log(`[SignTranscripts] DEBUG: Transcript Status: ${transcript.status}`);
        console.log(`[SignTranscripts] DEBUG: Current Action: ${currentAction}`);


        // --- VERIFICAÇÃO DEFENSIVA ADICIONADA ---
        if (isSchoolLevelUser) {
          if (userSchoolId === null) {
            console.error(`[SignTranscripts] RLS Mismatch (School): User profile school_id is null.`);
            throw new Error(`O histórico de ${transcript.students?.full_name} não pode ser assinado: Seu perfil não está associado a uma escola. Por favor, verifique as configurações da sua conta.`);
          }
          if (transcriptSchoolId === null) {
            console.error(`[SignTranscripts] RLS Mismatch (School): Transcript school_id is null.`);
            throw new Error(`O histórico de ${transcript.students?.full_name} não pode ser assinado: O histórico não está associado a uma escola. Por favor, entre em contato com o suporte.`);
          }

          if (userSchoolId !== transcriptSchoolId) {
            console.error(`[SignTranscripts] RLS Mismatch (School): User profile school_id (${userSchoolId}) does not match transcript school_id (${transcriptSchoolId}).`);
            throw new Error(`O histórico de ${transcript.students?.full_name} não pertence à sua escola (${transcript.schools?.name}). ID da escola do perfil: ${userSchoolId}, ID da escola do histórico: ${transcriptSchoolId}. Não é possível assinar.`);
          }
        }
        
        // Check for municipality_id for municipal roles
        if (isMunicipalLevelUser) {
          if (userMunicipalityId === null) {
            console.error(`[SignTranscripts] RLS Mismatch (Municipality): User profile municipality_id is null.`);
            throw new Error(`O histórico de ${transcript.students?.full_name} não pode ser assinado: Seu perfil não está associado a uma rede municipal. Por favor, verifique as configurações da sua conta.`);
          }
          if (transcriptMunicipalityId === null) {
            console.error(`[SignTranscripts] RLS Mismatch (Municipality): Transcript municipality_id is null.`);
            throw new Error(`O histórico de ${transcript.students?.full_name} não pode ser assinado: O histórico não está associado a uma rede municipal. Por favor, entre em contato com o suporte.`);
          }
          if (userMunicipalityId !== transcriptMunicipalityId) {
            console.error(`[SignTranscripts] RLS Mismatch (Municipality): User profile municipality_id (${userMunicipalityId}) does not match transcript municipality_id (${transcriptMunicipalityId}).`);
            throw new Error(`O histórico de ${transcript.students?.full_name} não pertence à sua rede municipal. ID da rede do perfil: ${userMunicipalityId}, ID da rede do histórico: ${transcriptMunicipalityId}. Não é possível assinar.`);
          }
        }
        // --- FIM DA VERIFICAÇÃO DEFENSIVA ---

        // Fetch the full 'data' content of the transcript
        const { data: fullTranscriptData, error: fetchDataError } = await supabase
          .from('transcripts')
          .select('data, signed_data') // Also fetch existing signed_data
          .eq('id', transcriptId)
          .single();

        if (fetchDataError) throw fetchDataError;
        if (!fullTranscriptData || !fullTranscriptData.data) {
          throw new Error(`Conteúdo do histórico (data) não encontrado para o ID: ${transcriptId}`);
        }

        let newSignedData = { ...(fullTranscriptData.signed_data || fullTranscriptData.data) }; // Start with existing signed_data or full data

        const baseUpdate = { updated_at: now };
        let newDocumentHash: string | null = null;

        if (currentAction === 'sign') {
          if (role === 'secretary') { // Changed role order
            newSignedData = { ...newSignedData, secretary: signerProfileData }; // Secretary signs first
            newDocumentHash = await generateTranscriptHash(newSignedData); // Recalculate hash
            return {
              ...baseUpdate,
              id: transcriptId,
              secretary_signed_at: now,
              secretary_signature_id: user.id,
              status: 'pending_director_signature', // Next step for director
              signed_data: newSignedData,
              document_hash: newDocumentHash, // Update document_hash
            };
          } else if (role === 'school_admin') { // Changed role order
            newSignedData = { ...newSignedData, director: signerProfileData }; // Director signs last
            newDocumentHash = await generateTranscriptHash(newSignedData); // Recalculate hash
            return {
              ...baseUpdate,
              id: transcriptId,
              director_signed_at: now,
              director_signature_id: user.id,
              status: 'signed', // Fully signed
              signed_data: newSignedData,
              document_hash: newDocumentHash, // Update document_hash
            };
          }
        } else if (currentAction === 'reject') {
          // When rejecting, clear signatures and signed_data, reset status
          newDocumentHash = await generateTranscriptHash(fullTranscriptData.data); // Hash of original data
          return {
            ...baseUpdate,
            id: transcriptId,
            status: 'rejected',
            director_signed_at: null,
            director_signature_id: null,
            secretary_signed_at: null,
            secretary_signature_id: null,
            signed_data: {}, // Clear signed data on rejection
            document_hash: newDocumentHash, // Reset hash to original data hash
          };
        }
        return null;
      }));

      const validUpdates = updates.filter(Boolean);
      console.log(`[SignTranscripts] DEBUG: Valid updates to send to Supabase:`, validUpdates);


      if (validUpdates.length > 0) {
        const { error: updateError } = await supabase
          .from('transcripts')
          .upsert(validUpdates, { onConflict: 'id' }); // Use upsert to update multiple records by ID

        if (updateError) throw updateError;

        // Create notifications for the next step or rejection using Edge Function
        for (const transcriptId of selectedTranscripts) {
          const transcript = pendingTranscripts.find(t => t.id === transcriptId);
          if (!transcript) continue;

          if (currentAction === 'sign') {
            if (role === 'secretary') { // Changed role order
              // Notify director
              const { data: directorProfiles, error: directorError } = await supabase
                .from('profiles')
                .select('id')
                .eq('school_id', schoolIdFromUrl) // Usar o schoolId da URL
                .eq('role', 'school_admin'); // Changed to school_admin

              if (directorError) console.error('Client: Error fetching director for notification:', directorError);

              if (directorProfiles && directorProfiles.length > 0) {
                for (const director of directorProfiles) {
                  console.log(`Client: Invoking create-notification for director ${director.id} for student ${transcript.students?.full_name}`);
                  const { data: notificationResponse, error: notificationError } = await supabase.functions.invoke('create-notification', {
                    body: JSON.stringify({
                      user_id: director.id, // Changed to director.id
                      type: 'transcript_pending_signature',
                      target_id: transcriptId,
                      message: `Histórico de ${transcript.students?.full_name} aguardando sua assinatura como Diretor(a).`, // Changed message
                    }),
                    headers: {
                      'Content-Type': 'application/json',
                    },
                  });

                  if (notificationError) {
                    console.error('Client: Error invoking create-notification edge function for director:', notificationError);
                    toast({
                      title: "Erro na notificação",
                      description: notificationError.message || "Não foi possível enviar a notificação para o diretor.",
                      variant: "destructive",
                    });
                  } else if (notificationResponse && notificationResponse.error) {
                    console.error('Client: Edge function returned error for director notification:', notificationResponse.error);
                    toast({
                      title: "Erro na notificação",
                      description: notificationResponse.error || "Não foi possível enviar a notificação para o diretor.",
                      variant: "destructive",
                    });
                  } else {
                    console.log('Client: Notification edge function invoked successfully for director:', notificationResponse);
                  }
                }
              }
            } else if (role === 'school_admin') { // Changed role order
              // Notify the creator that it's fully signed
              // For now, we'll just toast success. A more robust system might notify the original creator.
              console.log(`Client: Transcript ${transcriptId} fully signed by director. No further notification logic implemented for creator.`);
            }
          } else if (currentAction === 'reject') {
            // Notify the creator that it was rejected
            // This would require knowing who created the transcript, which isn't directly in the transcript table yet.
            // For now, we'll just toast success.
            console.log(`Client: Transcript ${transcriptId} rejected. No notification logic implemented for creator.`);
          }
        }

        toast({
          title: 'Sucesso',
          description: `${selectedTranscripts.length} histórico(s) ${currentAction === 'sign' ? 'assinado(s)' : 'rejeitado(s)'} com sucesso!`,
        });
        setDialogOpen(false);
        fetchPendingTranscripts(); // Refresh the list
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível realizar a ação.',
        variant: 'destructive',
      });
    } finally {
      setIsSigning(false);
      setPassword('');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando históricos...</span>
      </div>
    );
  }

  // Verificação final antes de renderizar a página
  if (!user || !profile || !schoolIdFromUrl || (role !== 'school_admin' && role !== 'secretary')) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle className="text-destructive">Acesso Restrito</CardTitle>
            <CardDescription>
              Você não tem permissão para acessar esta página ou a escola não foi especificada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/">
              <Button>Voltar para o Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentRoleLabel = role === 'secretary' ? 'Secretário(a) Escolar' : 'Diretor(a)'; // Changed role order
  const pendingStatusLabel = role === 'secretary' ? 'aguardando sua assinatura como Secretário(a) Escolar' : 'aguardando sua assinatura como Diretor(a)'; // Changed role order

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card shadow-school">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link to="/">
              <img src={correctLogo} alt="Correct Logo" className="h-16 w-16" />
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-primary">Assinar Históricos</h1>
              <p className="text-muted-foreground">Históricos pendentes de assinatura para {currentRoleLabel}</p>
            </div>
            <Link to="/">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Signature className="h-5 w-5" />
              Históricos Pendentes ({pendingTranscripts.length})
            </CardTitle>
            <CardDescription>
              Selecione os históricos que deseja assinar ou rejeitar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingTranscripts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum histórico {pendingStatusLabel} no momento.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 border-b pb-3">
                  <Checkbox
                    id="selectAll"
                    checked={selectedTranscripts.length === pendingTranscripts.length && pendingTranscripts.length > 0}
                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                  />
                  <Label htmlFor="selectAll" className="text-sm font-medium">
                    Selecionar Todos ({selectedTranscripts.length} selecionado{selectedTranscripts.length !== 1 ? 's' : ''})
                  </Label>
                </div>
                <div className="grid gap-4">
                  {pendingTranscripts.map((transcript) => (
                    <div key={transcript.id} className="flex items-center space-x-4 p-3 border rounded-md">
                      <Checkbox
                        id={`transcript-${transcript.id}`}
                        checked={selectedTranscripts.includes(transcript.id)}
                        onCheckedChange={(checked) => handleSelectTranscript(transcript.id, checked as boolean)}
                      />
                      <div className="flex-1 grid gap-1">
                        <Label htmlFor={`transcript-${transcript.id}`} className="text-base font-medium">
                          {transcript.students?.full_name}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Escola: {transcript.schools?.name} | Criado em: {new Date(transcript.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => fetchTranscriptForPreview(transcript.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Pré-visualizar
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <Button
                    variant="destructive"
                    onClick={() => openConfirmationDialog('reject')}
                    disabled={selectedTranscripts.length === 0 || isSigning}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Rejeitar Selecionados
                  </Button>
                  <Button
                    onClick={() => openConfirmationDialog('sign')}
                    disabled={selectedTranscripts.length === 0 || isSigning}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Assinar Selecionados
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar {currentAction === 'sign' ? 'Assinatura' : 'Rejeição'}</DialogTitle>
            <DialogDescription>
              Você está prestes a {currentAction === 'sign' ? 'assinar' : 'rejeitar'} {selectedTranscripts.length} histórico(s).
              Esta ação é irreversível. Por favor, digite sua senha para confirmar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              disabled={isSigning}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSigning}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmAction}
              disabled={isSigning || !password}
              variant={currentAction === 'sign' ? 'default' : 'destructive'}
            >
              {isSigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirmando...
                </>
              ) : (
                currentAction === 'sign' ? 'Confirmar Assinatura' : 'Confirmar Rejeição'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pré-visualização do Histórico</DialogTitle>
            <DialogDescription>
              Verifique os detalhes do histórico antes de assinar.
            </DialogDescription>
          </DialogHeader>
          {loadingPreview ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Carregando pré-visualização...</span>
            </div>
          ) : previewStudent ? (
            <TranscriptPreview
              student={previewStudent}
              academicYears={previewAcademicYears}
              grades={previewGrades}
              trimesterGrades={previewTrimesterGrades}
              schoolPeriod={previewSchoolPeriod}
              transcriptId={previewTranscriptId}
              directorProfile={previewDirectorProfile}
              secretaryProfile={previewSecretaryProfile}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Não foi possível carregar os dados do histórico.
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}