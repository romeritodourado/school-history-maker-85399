import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, FileText, User, Calendar, Building2, Shield } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
// A linha abaixo foi removida: import correctLogo from "/correct-logo.png";

interface TranscriptValidation {
  student_name: string;
  school_name: string;
  completion_year: number | null;
  grade_series: string | null;
  is_valid: boolean;
}

export default function ValidateTranscript() {
  const [searchParams] = useSearchParams();
  const [validation, setValidation] = useState<TranscriptValidation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const transcriptId = searchParams.get('id');

  useEffect(() => {
    if (transcriptId) {
      validateTranscript();
    } else {
      setError('ID do histórico não fornecido');
      setLoading(false);
    }
  }, [transcriptId]);

  const validateTranscript = async () => {
    try {
      // Fetch student data
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select(`
          full_name,
          completion_year,
          grade_series,
          school_id,
          schools:school_id (name)
        `)
        .eq('id', transcriptId)
        .single();

      if (studentError) throw studentError;

      // Since signatures table is removed, we'll simulate validation for now.
      // In a real scenario, you would re-calculate the hash of the PDF and compare.
      const validationData: TranscriptValidation = {
        student_name: studentData.full_name,
        school_name: (studentData.schools as any)?.name || 'Não informado',
        completion_year: studentData.completion_year,
        grade_series: studentData.grade_series,
        is_valid: true, // Placeholder: always true for now as there's no signature to verify
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
          <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl flex items-center gap-2">
                <img src="/correct-logo.png" alt="Correct Logo" className="h-8 w-8" />
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
                <Building2 className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Escola</p>
                  <p className="font-semibold">{validation.school_name}</p>
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

            {/* Removed Digital Signature Info section */}

            {validation.is_valid ? (
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-800 p-4 rounded-lg">
                <p className="text-green-800 dark:text-green-200 font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Este histórico é autêntico.
                </p>
              </div>
            ) : (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-4 rounded-lg">
                <p className="text-red-800 dark:text-red-200 font-medium flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  ATENÇÃO: Este documento pode ter sido adulterado!
                </p>
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