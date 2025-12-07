import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, FileText, User, Calendar, Building2, School } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import correctLogo from "/correct-logo.png";
// QRCode import removed as it's no longer needed for this page

type AppRole = 'super_admin' | 'municipal_secretary' | 'network_manager' | 'school_admin' | 'secretary' | 'teacher';

interface TranscriptValidation {
  student_name: string;
  school_name: string;
  municipality_name: string;
  completion_year: number | null;
  grade_series: string | null;
  is_valid: boolean;
  document_hash: string | null;
  signed_data: any | null;
  director_name: string | null;
  director_registration: string | null;
  director_signed_at: string | null;
  secretary_name: string | null;
  secretary_registration: string | null;
  secretary_signed_at: string | null;
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

export default function ValidateTranscript() {
  const [searchParams] = useSearchParams();
  const [validation, setValidation] = useState<TranscriptValidation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null); // Removed state

  const transcriptId = searchParams.get('id');

  useEffect(() => {
    if (transcriptId) {
      validateTranscript();
      // QR Code generation logic removed from here
    } else {
      setError('ID do histórico não fornecido');
      setLoading(false);
    }
  }, [transcriptId]);

  const validateTranscript = async () => {
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
          secretary_signed_at,
          students (full_name, completion_year, grade_series),
          schools (name),
          municipalities (name),
          director_signature_id (name, registration_number),
          secretary_signature_id (name, registration_number)
        `)
        .eq('id', transcriptId)
        .single();

      if (transcriptError) throw transcriptError;
      if (!transcriptData) throw new Error('Histórico não encontrado.');

      let isValid = false;
      let regeneratedHash: string | null = null;

      if (transcriptData.signed_data && transcriptData.document_hash) {
        regeneratedHash = await generateTranscriptHash(transcriptData.signed_data);
        isValid = regeneratedHash === transcriptData.document_hash;
      } else {
        isValid = false; // Cannot validate if data or hash is missing
      }

      const directorProfile = transcriptData.director_signature_id as { name: string | null, registration_number: string | null } | null;
      const secretaryProfile = transcriptData.secretary_signature_id as { name: string | null, registration_number: string | null } | null;

      const validationData: TranscriptValidation = {
        student_name: (transcriptData.students as { full_name: string } | null)?.full_name || 'Não informado',
        school_name: (transcriptData.schools as { name: string } | null)?.name || 'Não informado',
        municipality_name: (transcriptData.municipalities as { name: string } | null)?.name || 'Não informado',
        completion_year: (transcriptData.students as { completion_year: number | null } | null)?.completion_year || null,
        grade_series: (transcriptData.students as { grade_series: string | null } | null)?.grade_series || null,
        is_valid: isValid,
        document_hash: transcriptData.document_hash,
        signed_data: transcriptData.signed_data,
        director_name: directorProfile?.name || null,
        director_registration: directorProfile?.registration_number || null,
        director_signed_at: transcriptData.director_signed_at,
        secretary_name: secretaryProfile?.name || null,
        secretary_registration: secretaryProfile?.registration_number || null,
        secretary_signed_at: transcriptData.secretary_signed_at,
      };

      setValidation(validationData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao validar histórico');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="animate-pulse text-lg">Validando histórico...</div>
      </div>
    );
  }

  if (error || !validation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-destructive/5 via-background to-destructive/10 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-6 w-6" />
              Histórico Não Encontrado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {error || 'O histórico solicitado não foi encontrado.'}
            </p>
            <Link to="/">
              <Button>Voltar para o sistema</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="container mx-auto max-w-3xl py-8">
        <Card className="border-2 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6">
            <div className="flex flex-col items-center justify-center">
              <Link to="/" className="mb-4">
                <img src={correctLogo} alt="Correct Logo" className="h-32 w-32 object-contain" />
              </Link>
              <CardTitle className="text-2xl text-center mb-4">
                Validação de Histórico Escolar
              </CardTitle>
              <Badge 
                variant={validation.is_valid ? "default" : "destructive"}
                className="text-lg px-4 py-2"
              >
                {validation.is_valid ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Autêntico
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 mr-2" />
                    Adulterado
                  </>
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid gap-4">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Aluno</p>
                  <p className="font-semibold text-lg">{validation.student_name}</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-3">
                <School className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Escola</p>
                  <p className="font-semibold">{validation.school_name}</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Rede Municipal</p>
                  <p className="font-semibold">{validation.municipality_name}</p>
                </div>
              </div>

              <Separator />

              {validation.completion_year && (
                <>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Ano de Conclusão</p>
                      <p className="font-semibold">{validation.completion_year}</p>
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {validation.grade_series && (
                <>
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Série/Ano</p>
                      <p className="font-semibold">{validation.grade_series}</p>
                    </div>
                  </div>
                  <Separator />
                </>
              )}
            </div>

            {validation.is_valid ? (
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-800 p-4 rounded-lg">
                <p className="text-green-800 dark:text-green-200 font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Este histórico é autêntico e não foi adulterado.
                </p>
                {validation.document_hash && (
                  <p className="text-xs text-muted-foreground mt-2 break-all">
                    Hash do Documento: {validation.document_hash}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-800 p-4 rounded-lg">
                <p className="text-red-800 dark:text-red-200 font-medium flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  ATENÇÃO: Este documento pode ter sido adulterado ou não foi assinado digitalmente!
                </p>
                {validation.document_hash && (
                  <p className="text-xs text-muted-foreground mt-2 break-all">
                    Hash do Documento (registrado): {validation.document_hash}
                  </p>
                )}
              </div>
            )}

            {(validation.director_name || validation.secretary_name) && (
              <div className="mt-6 space-y-4">
                <h3 className="text-lg font-semibold">Assinaturas Digitais</h3>
                {validation.director_name && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Diretor(a)</p>
                      <p className="font-semibold">{validation.director_name}</p>
                      {validation.director_registration && (
                        <p className="text-xs text-muted-foreground">Registro: {validation.director_registration}</p>
                      )}
                      {validation.director_signed_at && (
                        <p className="text-xs text-muted-foreground">Assinado em: {new Date(validation.director_signed_at).toLocaleString('pt-BR')}</p>
                      )}
                    </div>
                  </div>
                )}
                {validation.secretary_name && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Secretário(a)</p>
                      <p className="font-semibold">{validation.secretary_name}</p>
                      {validation.secretary_registration && (
                        <p className="text-xs text-muted-foreground">Registro: {validation.secretary_registration}</p>
                      )}
                      {validation.secretary_signed_at && (
                        <p className="text-xs text-muted-foreground">Assinado em: {new Date(validation.secretary_signed_at).toLocaleString('pt-BR')}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>Correct - Sistema de Históricos Escolares - Validação Oficial</p>
          <p>Para mais informações, entre em contato com a secretaria da escola</p>
        </div>
      </div>
    </div>
  );
}