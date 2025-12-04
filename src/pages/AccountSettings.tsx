import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Mail, Lock, ArrowLeft } from 'lucide-react'; // Removido UploadCloud, Trash2
import { z } from 'zod';
import { passwordChangeSchema, profileUpdateSchema } from '@/lib/validationSchemas';
// Removido Progress

type AppRole = 'super_admin' | 'municipal_secretary' | 'network_manager' | 'school_admin' | 'secretary' | 'administrative_assistant';

export default function AccountSettings() {
  const { user, profile, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  // Removido signatureImageUrl state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  // Removido uploading, uploadProgress states
  // Removido signatureFileInputRef

  useEffect(() => {
    if (!authLoading && user && profile) {
      setName(profile.name || '');
      setEmail(user.email || '');
      setRegistrationNumber(profile.registration_number || '');
      // Removido setSignatureImageUrl
    }
  }, [user, profile, authLoading]);

  // Removido handleSignatureFileUpload
  // Removido handleRemoveSignature

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!user || !profile) {
      toast({
        title: 'Erro',
        description: 'Usuário não autenticado.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    try {
      // Validate name, email, registrationNumber
      profileUpdateSchema.parse({ 
        name, 
        email, 
        registration_number: registrationNumber, 
        // Removido signature_image_url
      });

      // Update profile name, registration_number
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          name, 
          email, // Update email in profile table as well for consistency
          registration_number: registrationNumber,
          signature_image_url: null // Definir como null, pois não usaremos mais a imagem
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update auth.users email if changed
      if (user.email !== email) {
        const { error: authUpdateError } = await supabase.auth.updateUser({ email });
        if (authUpdateError) throw authUpdateError;
      }

      toast({
        title: 'Sucesso',
        description: 'Informações pessoais atualizadas com sucesso!',
      });
    } catch (error) {
      toast({
        title: 'Erro ao atualizar perfil',
        description: error instanceof z.ZodError ? error.errors[0].message : error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!user) {
      toast({
        title: 'Erro',
        description: 'Usuário não autenticado.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    try {
      // Validate new password
      passwordChangeSchema.parse({ newPassword, confirmPassword });

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Senha atualizada com sucesso!',
      });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast({
        title: 'Erro ao atualizar senha',
        description: error instanceof z.ZodError ? error.errors[0].message : error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <p className="text-center mt-8">Você precisa estar logado para acessar esta página.</p>;
  }

  const isDirectorOrSecretary = role === 'school_admin' || role === 'secretary' || role === 'administrative_assistant';

  const getRoleLabel = (role: AppRole | null) => {
    if (!role) return 'N/A';
    const labels: Record<AppRole, string> = {
      super_admin: 'Super Administrador',
      municipal_secretary: 'Secretário(a) Municipal',
      network_manager: 'Gerente de Estatísticas',
      school_admin: 'Diretor Escolar',
      secretary: 'Secretário(a) Escolar',
      administrative_assistant: 'Assistente Administrativo', // Novo cargo
    };
    return labels[role] || role;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <header className="border-b bg-card shadow-school">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <User className="h-8 w-8" />
              Configurações da Conta
            </h1>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações Pessoais
            </CardTitle>
            <CardDescription>Atualize seu nome e email.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              {isDirectorOrSecretary && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="registrationNumber">Número de Registro/Decreto</Label>
                    <Input
                      id="registrationNumber"
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                      placeholder="Ex: 1247/2008"
                      disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Este número aparecerá abaixo da sua assinatura no histórico.
                    </p>
                  </div>
                  {/* Removido o bloco de upload de imagem de assinatura */}
                </>
              )}

              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Alterações'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Alterar Senha
            </CardTitle>
            <CardDescription>Defina uma nova senha para sua conta.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Alterando...
                  </>
                ) : (
                  'Alterar Senha'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}