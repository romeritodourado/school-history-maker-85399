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

interface TranscriptToSign {
  id: string;
  student_id: string;
  status: string;
  created_at: string;
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

  useEffect(() => {
    if (!authLoading && user && profile && schoolIdFromUrl) {
      fetchPendingTranscripts();
    } else if (!authLoading && (!user || !profile)) {
      toast({
        title: 'Acesso negado',
        description: 'Você precisa estar logado para acessar esta página.',
        variant: 'destructive',
      });
      navigate('/login');
    } else if (!authLoading && !schoolIdFromUrl) {
      toast({
        title: 'Erro',
        description: 'ID da escola não fornecido. Redirecionando para o dashboard.',
        variant: 'destructive',
      });
      navigate('/');
    }
  }, [authLoading, user, profile, schoolIdFromUrl, navigate]);

  const fetchPendingTranscripts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('transcripts')
        .select(`
          id,
          student_id,
          status,
          created_at,
          students (full_name),
          schools (name)
        `)
        .eq('school_id', schoolIdFromUrl)
        .order('created_at', { ascending: false });

      if (role === 'school_admin') {
        query = query.eq('status', 'pending_director_signature');
      } else if (role === 'secretary') {
        query = query.eq('status', 'pending_secretary_signature');
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

  const handleConfirmAction = async () => {
    if (!user?.email || !password) {
      toast({
        title: 'Erro',
        description: 'Email e senha são obrigatórios para confirmar a ação.',
        variant: 'destructive',
      });
      return;
    }

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

      const updates = selectedTranscripts.map(transcriptId => {
        const now = new Date().toISOString();
        const baseUpdate = {
          updated_at: now,
        };

        if (currentAction === 'sign') {
          if (role === 'school_admin') {
            return {
              ...baseUpdate,
              director_signed_at: now,
              director_signature_id: user.id,
              status: 'pending_secretary_signature', // Next step for secretary
            };
          } else if (role === 'secretary') {
            return {
              ...baseUpdate,
              secretary_signed_at: now,
              secretary_signature_id: user.id,
              status: 'signed', // Fully signed
            };
          }
        } else if (currentAction === 'reject') {
          return {
            ...baseUpdate,
            status: 'rejected',
            director_signed_at: null, // Clear previous signatures if rejected
            director_signature_id: null,
            secretary_signed_at: null,
            secretary_signature_id: null,
          };
        }
        return null;
      }).filter(Boolean);

      if (updates.length > 0) {
        const { error: updateError } = await supabase
          .from('transcripts')
          .upsert(updates, { onConflict: 'id' }); // Use upsert to update multiple records by ID

        if (updateError) throw updateError;

        // Create notifications for the next step or rejection using Edge Function
        for (const transcriptId of selectedTranscripts) {
          const transcript = pendingTranscripts.find(t => t.id === transcriptId);
          if (!transcript) continue;

          if (currentAction === 'sign') {
            if (role === 'school_admin') {
              // Notify secretary
              const { data: secretaryProfiles, error: secretaryError } = await supabase
                .from('profiles')
                .select('id')
                .eq('school_id', schoolIdFromUrl)
                .eq('role', 'secretary');

              if (secretaryError) console.error('Client: Error fetching secretary for notification:', secretaryError);

              if (secretaryProfiles && secretaryProfiles.length > 0) {
                for (const secretary of secretaryProfiles) {
                  console.log(`Client: Invoking create-notification for secretary ${secretary.id} for student ${transcript.students?.full_name}`);
                  const { data: notificationResponse, error: notificationError } = await supabase.functions.invoke('create-notification', {
                    body: JSON.stringify({
                      user_id: secretary.id,
                      type: 'transcript_pending_signature',
                      target_id: transcriptId,
                      message: `Histórico de ${transcript.students?.full_name} aguardando sua assinatura como Secretário(a).`,
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
            } else if (role === 'secretary') {
              // Notify the creator that it's fully signed
              // For now, we'll just toast success. A more robust system might notify the original creator.
              console.log(`Client: Transcript ${transcriptId} fully signed by secretary. No further notification logic implemented for creator.`);
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

  const currentRoleLabel = role === 'school_admin' ? 'Diretor(a)' : 'Secretário(a)';
  const pendingStatusLabel = role === 'school_admin' ? 'aguardando sua assinatura como Diretor(a)' : 'aguardando sua assinatura como Secretário(a)';

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
                      <Link to={`/visualizar/${transcript.student_id}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar
                        </Button>
                      </Link>
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
    </div>
  );
}