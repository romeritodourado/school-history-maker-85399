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
import { generateTranscriptHash } from '@/lib/hashUtils'; // Importar função de hash centralizada

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
  cpf: string | null; // NOVO
}

interface HistoricalSignerData { // NOVO: Interface para dados históricos do signatário
  name: string | null;
  registration_number: string | null;
  cpf: string | null;
}

interface TranscriptToSign {
  id: string;
  student_id: string;
  status: string;
  created_at: string;
  director_signature_id: string | null;
  secretary_signature_id: string | null;
  director_signed_at: string | null; // NOVO
  secretary_signed_at: string | null; // NOVO
  document_hash: string | null; // NOVO
  school_id: string;
  municipality_id: string;
  data: any; // Adicionado para acessar o conteúdo original
  signed_data: any | null; // Adicionado para acessar o conteúdo assinado
  students: {
    full_name: string;
  } | null;
  schools: {
    name: string;
  } | null;
}

export default function SignTranscripts() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  let schoolIdFromUrl = searchParams.get('schoolId');
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
  const [previewHistoricalDirectorData, setPreviewHistoricalDirectorData] = useState<HistoricalSignerData | null>(null); // NOVO
  const [previewHistoricalSecretaryData, setPreviewHistoricalSecretaryData] = useState<HistoricalSignerData | null>(null); // NOVO
  const [previewDirectorSignedAt, setPreviewDirectorSignedAt] = useState<string | null>(null); // NOVO
  const [previewSecretarySignedAt, setPreviewSecretarySignedAt] = useState<string | null>(null); // NOVO
  const [previewDocumentHash, setPreviewDocumentHash] = useState<string | null>(null); // NOVO
  const [loadingPreview, setLoadingPreview] = useState(false);

  const directorRoles = ['school_admin', 'vice_school_admin']; // Incluindo vice_school_admin

  useEffect(() => {
    // Limpeza robusta do schoolIdFromUrl
    if (schoolIdFromUrl) {
      const firstQuestionMarkIndex = schoolIdFromUrl.indexOf('?');
      if (firstQuestionMarkIndex !== -1) {
        schoolIdFromUrl = schoolIdFromUrl.substring(0, firstQuestionMarkIndex);
      }
      schoolIdFromUrl = schoolIdFromUrl.trim(); // Garante que não há espaços em branco
    }

    if (!authLoading && user && profile) {
      console.log("[SignTranscripts] useEffect: User is authenticated.");
      
      const isSchoolLevelUser = [...directorRoles, 'secretary', 'administrative_assistant'].includes(profile.role || '');
      
      if (isSchoolLevelUser && !profile.school_id) {
        toast({
          title: 'Erro de Configuração do Perfil',
          description: `Seu perfil de ${profile.role} não está associado a uma escola. Por favor, entre em contato com o administrador do sistema para corrigir.`,
          variant: 'destructive',
          duration: 8000,
        });
        setLoading(false);
        navigate('/');
        return;
      }
      
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
      
      if (!schoolIdFromUrl) {
        toast({
          title: 'Erro',
          description: 'ID da escola não fornecido na URL. Redirecionando para o dashboard.',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }
      
      const profileSchoolIdString = profile.school_id ? String(profile.school_id).trim() : null;
      const urlSchoolIdString = schoolIdFromUrl ? String(schoolIdFromUrl).trim() : null;

      if (isSchoolLevelUser && profileSchoolIdString !== urlSchoolIdString) {
        console.error("[SignTranscripts] useEffect: Access denied - Profile school ID does not match URL school ID.");
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
      console.log("[SignTranscripts] useEffect: User not authenticated or profile not loaded. Redirecting to login.");
      toast({
        title: 'Acesso negado',
        description: 'Você precisa estar logado para acessar esta página.',
        variant: 'destructive',
      });
      navigate('/login');
    }
  }, [authLoading, user, profile, schoolIdFromUrl, navigate, toast]);

  const fetchPendingTranscripts = async () => {
    console.log("[SignTranscripts] fetchPendingTranscripts: Starting fetch.");
    setLoading(true);
    try {
      let query = supabase
        .from('transcripts')
        .select('id, student_id, status, created_at, director_signature_id, secretary_signature_id, director_signed_at, secretary_signed_at, document_hash, school_id, municipality_id, data, signed_data, students (full_name), schools (name)');
      
      if (schoolIdFromUrl) {
        query = query.eq('school_id', schoolIdFromUrl);
        console.log("[SignTranscripts] Query filter: school_id =", schoolIdFromUrl);
      } else {
        console.warn("[SignTranscripts] No schoolIdFromUrl provided. This might be an issue if the user is school-level.");
        setPendingTranscripts([]);
        setLoading(false);
        return;
      }
      
      if (role === 'secretary') {
        query = query.eq('status', 'pending_secretary_signature');
        console.log("[SignTranscripts] Query filter: status = pending_secretary_signature (for secretary)");
      } else if (directorRoles.includes(role || '')) { // Diretor ou Vice-Diretor
        query = query.eq('status', 'pending_director_signature');
        console.log("[SignTranscripts] Query filter: status = pending_director_signature (for school_admin/vice_school_admin)");
      } else {
        console.log("[SignTranscripts] User role is not secretary or school_admin/vice_school_admin. No pending transcripts to show.");
        setPendingTranscripts([]);
        setLoading(false);
        return;
      }
      
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) {
        console.error("[SignTranscripts] Supabase query error:", error);
        throw error;
      }

      console.log("[SignTranscripts] Fetched data (raw):", data);
      setPendingTranscripts(data || []);
      setSelectedTranscripts([]);
    } catch (error: any) {
      console.error("[SignTranscripts] Error in fetchPendingTranscripts catch block:", error);
      toast({
        title: 'Erro ao carregar históricos',
        description: error.message || 'Não foi possível carregar os históricos pendentes. Por favor, tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      console.log("[SignTranscripts] fetchPendingTranscripts: Finished.");
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
      const { data: transcriptData, error: transcriptError } = await supabase
        .from('transcripts')
        .select('id, student_id, school_id, municipality_id, document_hash, signed_data, director_signed_at, director_signature_id, secretary_signed_at, secretary_signature_id, students (full_name, mother_name, father_name, birth_date, birth_place, birth_state, student_status, grade_series, observations), schools (name, municipality_id, address, city, state, logo_url, authorization_decree_url, official_gazette_url, municipalities (name, emblem_url))')
        .eq('id', transcriptId)
        .single();

      if (transcriptError) throw transcriptError;
      if (!transcriptData) throw new Error('Histórico não encontrado.');

      const studentId = transcriptData.student_id;
      if (!studentId) {
        throw new Error('ID do aluno não encontrado no histórico. O histórico pode estar corrompido ou o aluno foi excluído.');
      }

      if (!transcriptData.students) {
        throw new Error('Dados do aluno não encontrados para este histórico. O aluno pode ter sido excluído ou há uma inconsistência nos dados.');
      }
      if (!transcriptData.schools) {
        throw new Error('Dados da escola não encontrados para este histórico. A escola pode ter sido excluída ou há uma inconsistência nos dados.');
      }

      // Determine which data to use for preview: signed_data if available, otherwise data
      const previewDisplayData = transcriptData.signed_data || transcriptData.data;
      if (!previewDisplayData) throw new Error("Dados do histórico para pré-visualização estão vazios.");

      const student: StudentData = {
        id: studentId,
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
      setPreviewDirectorSignedAt(transcriptData.director_signed_at);
      setPreviewSecretarySignedAt(transcriptData.secretary_signed_at);
      setPreviewDocumentHash(transcriptData.document_hash);

      setPreviewAcademicYears(previewDisplayData.academicYears || []);
      setPreviewGrades(previewDisplayData.yearGrades || {});
      setPreviewTrimesterGrades(previewDisplayData.trimesterGrades || []);
      setPreviewSchoolPeriod(previewDisplayData.schoolPeriod || undefined);

      // Set historical signer data from the transcript's data/signed_data
      setPreviewHistoricalDirectorData(previewDisplayData.director || null);
      setPreviewHistoricalSecretaryData(previewDisplayData.secretary || null);

      let directorProfile: ProfileData | null = null;
      if (transcriptData.director_signature_id) {
        const { data: dirProfile, error: dirError } = await supabase
          .from('profiles')
          .select('id, name, registration_number, role, cpf')
          .eq('id', transcriptData.director_signature_id)
          .single();
        
        // Tratamento de erro PGRST116 (No rows found)
        if (dirError && dirError.code !== 'PGRST116') {
          console.error('Error fetching director profile:', dirError);
          throw dirError;
        }
        directorProfile = dirProfile;
      }
      setPreviewDirectorProfile(directorProfile);

      let secretaryProfile: ProfileData | null = null;
      if (transcriptData.secretary_signature_id) {
        const { data: secProfile, error: secError } = await supabase
          .from('profiles')
          .select('id, name, registration_number, role, cpf')
          .eq('id', transcriptData.secretary_signature_id)
          .single();
        
        // Tratamento de erro PGRST116 (No rows found)
        if (secError && secError.code !== 'PGRST116') {
          console.error('Error fetching secretary profile:', secError);
          throw secError;
        }
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

    const isSchoolLevelUser = [...directorRoles, 'secretary', 'administrative_assistant'].includes(profile.role || '');
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

    setIsSigning(true);
    try {
      // 1. Autenticar o usuário com a senha fornecida
      console.log(`[Auth Check] Attempting re-authentication for user: ${user.email}`);
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });

      if (authError) {
        console.error(`[Auth Check] Re-authentication failed:`, authError);
        throw new Error('Senha incorreta. Não foi possível confirmar a ação.');
      }
      console.log(`[Auth Check] Re-authentication successful.`);

      const now = new Date().toISOString();
      const signerProfileData = {
        id: user.id,
        name: profile.name,
        registration_number: profile.registration_number,
        cpf: profile.cpf, // NOVO: Incluir CPF
        role: profile.role,
      };

      const updates = await Promise.all(selectedTranscripts.map(async transcriptId => {
        const transcript = pendingTranscripts.find(t => t.id === transcriptId);
        if (!transcript) return null;
        
        const userSchoolId = profile.school_id;
        const transcriptSchoolId = transcript.school_id;
        const userMunicipalityId = profile.municipality_id;
        const transcriptMunicipalityId = transcript.municipality_id;

        // --- VALIDAÇÕES DE SEGURANÇA E FLUXO DE TRABALHO (Adicionado/Reforçado) ---
        
        // 1. Validação de Papel e Status
        if (profile.role === 'secretary') {
          if (transcript.status !== 'pending_secretary_signature') {
            console.warn(`[Validation Failed] Transcript ${transcriptId} status is ${transcript.status}, expected pending_secretary_signature.`);
            toast({
              title: 'Aviso',
              description: `Histórico de ${transcript.students?.full_name} não está pendente de assinatura do Secretário(a).`,
              variant: 'default',
            });
            return null;
          }
        } else if (directorRoles.includes(profile.role || '')) {
          if (transcript.status !== 'pending_director_signature') {
            console.warn(`[Validation Failed] Transcript ${transcriptId} status is ${transcript.status}, expected pending_director_signature.`);
            toast({
              title: 'Aviso',
              description: `Histórico de ${transcript.students?.full_name} não está pendente de assinatura do Diretor(a).`,
              variant: 'default',
            });
            return null;
          }
        } else {
          // Se o usuário não é secretário nem diretor/vice-diretor, ele não deveria estar aqui.
          console.error(`[Validation Failed] User role ${profile.role} is not authorized to sign/reject.`);
          toast({
            title: 'Erro de Permissão',
            description: `Seu cargo (${profile.role}) não tem permissão para assinar ou rejeitar históricos.`,
            variant: 'destructive',
          });
          return null;
        }
        
        // 2. Validação de Escola (para usuários de nível escolar)
        if (isSchoolLevelUser) {
          if (userSchoolId !== transcriptSchoolId) {
            console.error(`[Validation Failed] School ID mismatch for ${transcriptId}. User: ${userSchoolId}, Transcript: ${transcriptSchoolId}`);
            toast({
              title: 'Acesso Negado',
              description: `Você só pode ${currentAction === 'sign' ? 'assinar' : 'rejeitar'} históricos da sua escola (${transcript.schools?.name}).`,
              variant: 'destructive',
            });
            return null;
          }
        }
        
        // 3. Validação de Rede Municipal (para usuários de nível municipal, embora não assinem, é bom manter a verificação de contexto)
        if (isMunicipalLevelUser) {
          if (userMunicipalityId !== transcriptMunicipalityId) {
            console.error(`[Validation Failed] Municipality ID mismatch for ${transcriptId}. User: ${userMunicipalityId}, Transcript: ${transcriptMunicipalityId}`);
            toast({
              title: 'Acesso Negado',
              description: `Você só pode ${currentAction === 'sign' ? 'assinar' : 'rejeitar'} históricos da sua rede municipal.`,
              variant: 'destructive',
            });
            return null;
          }
        }
        
        // --- FIM DAS VALIDAÇÕES ---

        let newSignedData: any;
        let newDocumentHash: string | null = null;
        let updatePayload: any = {}; // Não inclua 'id' aqui, pois será usado no .eq()

        if (currentAction === 'sign') {
          if (profile.role === 'secretary') {
            newSignedData = { ...(transcript.data || {}) }; // Start with original data
            newSignedData.secretary = signerProfileData;
            newDocumentHash = await generateTranscriptHash(newSignedData);
            
            updatePayload = {
              secretary_signed_at: now,
              secretary_signature_id: user.id,
              status: 'pending_director_signature',
              signed_data: newSignedData,
              document_hash: newDocumentHash,
            };
          } else if (directorRoles.includes(profile.role || '')) { // Diretor ou Vice-Diretor
            if (!transcript.signed_data) {
              throw new Error(`Histórico de ${transcript.students?.full_name} não possui dados assinados pelo secretário. Não é possível assinar como Diretor(a).`);
            }
            newSignedData = { ...(transcript.signed_data || {}) }; // Continue from secretary's signed data
            newSignedData.director = signerProfileData;
            newDocumentHash = await generateTranscriptHash(newSignedData);

            updatePayload = {
              director_signed_at: now,
              director_signature_id: user.id,
              status: 'signed',
              signed_data: newSignedData,
              document_hash: newDocumentHash,
            };
          }
        } else if (currentAction === 'reject') {
          // When rejecting, revert signed_data to original data and clear signature fields
          newSignedData = { ...(transcript.data || {}) }; // Revert to original data
          newDocumentHash = await generateTranscriptHash(newSignedData); // Hash the original data

          updatePayload = {
            status: 'rejected',
            document_hash: newDocumentHash,
            signed_data: newSignedData, // Revert signed_data to original data
            director_signature_id: null,
            director_signed_at: null,
            secretary_signature_id: null,
            secretary_signed_at: null,
          };
        }
        
        // Retorna o ID e o payload para o Promise.all
        return { id: transcriptId, payload: updatePayload };
      }));

      const validUpdates = updates.filter(Boolean) as { id: string, payload: any }[];
      console.log("[SignTranscripts] handleConfirmAction: validUpdates before updates:", validUpdates);

      if (validUpdates.length > 0) {
        // --- USANDO UPDATES INDIVIDUAIS ---
        const updatePromises = validUpdates.map(async ({ id, payload }) => {
          const { error: updateError } = await supabase
            .from('transcripts')
            .update(payload)
            .eq('id', id);
          
          if (updateError) {
            console.error(`Error updating transcript ${id}:`, updateError);
            throw new Error(`Falha ao atualizar histórico ${id}: ${updateError.message}`);
          }
        });

        await Promise.all(updatePromises);
        // --- FIM DOS UPDATES INDIVIDUAIS ---

        for (const { id: transcriptId } of validUpdates) {
          const transcript = pendingTranscripts.find(t => t.id === transcriptId);
          if (!transcript) continue;

          if (currentAction === 'sign') {
            if (role === 'secretary') {
              const { data: directorProfiles, error: directorError } = await supabase
                .from('profiles')
                .select('id')
                .eq('school_id', schoolIdFromUrl)
                .in('role', directorRoles); // Buscar Diretor E Vice-Diretor

              if (directorError) console.error('Client: Error fetching director for notification:', directorError);

              if (directorProfiles && directorProfiles.length > 0) {
                for (const director of directorProfiles) {
                  const { data: notificationResponse, error: notificationError } = await supabase.functions.invoke('create-notification', {
                    body: JSON.stringify({
                      user_id: director.id,
                      type: 'transcript_pending_signature',
                      target_id: transcriptId,
                      message: `Histórico de ${transcript.students?.full_name} aguardando sua assinatura como Diretor(a).`,
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
                  }
                }
              }
            }
          } else if (currentAction === 'reject') {
            // Notify the original creator (secretary or administrative_assistant) if rejected
            const creatorRole = transcript.data?.creator?.role; // Assuming creator info is stored in data
            const creatorId = transcript.data?.creator?.id;

            if (creatorId && ['secretary', 'administrative_assistant'].includes(creatorRole)) {
              const { data: notificationResponse, error: notificationError } = await supabase.functions.invoke('create-notification', {
                body: JSON.stringify({
                  user_id: creatorId,
                  type: 'transcript_rejected',
                  target_id: transcriptId,
                  message: `O histórico de ${transcript.students?.full_name} foi rejeitado por ${profile.name} (${profile.role}).`,
                }),
                headers: {
                  'Content-Type': 'application/json',
                },
              });

              if (notificationError) {
                console.error('Client: Error invoking create-notification edge function for rejection:', notificationError);
                toast({
                  title: "Erro na notificação",
                  description: notificationError.message || "Não foi possível enviar a notificação de rejeição.",
                  variant: "destructive",
                });
              } else if (notificationResponse && notificationResponse.error) {
                console.error('Client: Edge function returned error for rejection notification:', notificationResponse.error);
                toast({
                  title: "Erro na notificação",
                  description: notificationResponse.error || "Não foi possível enviar a notificação de rejeição.",
                  variant: "destructive",
                });
              }
            }
          }
        }

        toast({
          title: 'Sucesso',
          description: `${validUpdates.length} histórico(s) ${currentAction === 'sign' ? 'assinado(s)' : 'rejeitado(s)'} com sucesso!`,
        });
        setDialogOpen(false);
        fetchPendingTranscripts();
      } else {
        // Se não houve updates válidos, mas a autenticação passou, apenas feche o diálogo.
        setDialogOpen(false);
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

  if (!user || !profile || !schoolIdFromUrl || (!directorRoles.includes(role || '') && role !== 'secretary')) {
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

  const currentRoleLabel = role === 'secretary' ? 'Secretário(a) Escolar' : 'Diretor(a) / Vice-Diretor(a)';
  const pendingStatusLabel = role === 'secretary' ? 'aguardando sua assinatura como Secretário(a) Escolar' : 'aguardando sua assinatura como Diretor(a)';

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
              historicalDirectorData={previewHistoricalDirectorData} // NOVO
              historicalSecretaryData={previewHistoricalSecretaryData} // NOVO
              directorSignedAt={previewDirectorSignedAt} // NOVO
              secretarySignedAt={previewSecretarySignedAt} // NOVO
              documentHash={previewDocumentHash} // NOVO
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