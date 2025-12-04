import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Mail, Lock, ArrowLeft, UploadCloud, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { passwordChangeSchema, profileUpdateSchema } from '@/lib/validationSchemas';
import { Progress } from '@/components/ui/progress';

type AppRole = 'super_admin' | 'municipal_secretary' | 'network_manager' | 'school_admin' | 'secretary';

export default function AccountSettings() {
  const { user, profile, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [signatureImageUrl, setSignatureImageUrl] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const signatureFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && user && profile) {
      setName(profile.name || '');
      setEmail(user.email || '');
      setRegistrationNumber(profile.registration_number || '');
      setSignatureImageUrl(profile.signature_image_url || null);
    }
  }, [user, profile, authLoading]);

  const handleSignatureFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setSignatureImageUrl(null); // Clear previous URL

    const fileExt = file.name.split('.').pop();
    const fileName = `${user?.id}_signature_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`; // Store directly in the bucket root for user_signatures

    try {
      const { data, error } = await supabase.storage
        .from('user_signatures')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (event) => {
            if (event.totalBytes > 0) {
              setUploadProgress(Math.round((event.loaded / event.totalBytes) * 100));
            }
          },
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('user_signatures')
        .getPublicUrl(filePath);

      setSignatureImageUrl(publicUrlData.publicUrl);
      toast({
        title: 'Upload de assinatura concluído!',
        description: 'A imagem da sua assinatura foi enviada com sucesso.',
      });
    } catch (error: any) {
      console.error('Error uploading signature:', error);
      toast({
        title: 'Erro no upload da assinatura',
        description: error.message || 'Não foi possível enviar a imagem da assinatura.',
        variant: 'destructive',
      });
      setSignatureImageUrl(null);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveSignature = () => {
    setSignatureImageUrl(null);
    if (signatureFileInputRef.current) {
      signatureFileInputRef.current.value = '';
    }
    toast({
      title: 'Assinatura removida',
      description: 'A imagem da assinatura foi desvinculada do seu perfil.',
    });
  };

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
      // Validate name, email, registrationNumber, signatureImageUrl
      profileUpdateSchema.parse({ 
        name, 
        email, 
        registration_number: registrationNumber, 
        signature_image_url: signatureImageUrl || '' 
      });

      // Update profile name, registration_number, signature_image_url
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          name, 
          email, // Update email in profile table as well for consistency
          registration_number: registrationNumber,
          signature_image_url: signatureImageUrl
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

  const isDirectorOrSecretary = role === 'school_admin' || role === 'secretary';

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
                  disabled={loading || uploading}
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
                  disabled={loading || uploading}
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
                      disabled={loading || uploading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Este número aparecerá abaixo da sua assinatura no histórico.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signatureImage">Imagem da Assinatura (Opcional)</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="signatureImage"
                        type="file"
                        accept="image/*"
                        onChange={handleSignatureFileUpload}
                        ref={signatureFileInputRef}
                        className="flex-1"
                        disabled={uploading || loading}
                      />
                      {signatureImageUrl && (
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={handleRemoveSignature}
                          disabled={uploading || loading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {uploading && (
                      <Progress value={uploadProgress} className="w-full mt-2" />
                    )}
                    {signatureImageUrl && (
                      <div className="mt-4 flex items-center space-x-4">
                        <img src={signatureImageUrl} alt="Assinatura" className="h-20 w-auto object-contain border rounded-md" />
                        <p className="text-sm text-muted-foreground">Imagem da assinatura carregada</p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Faça o upload de uma imagem digitalizada da sua assinatura.
                    </p>
                  </div>
                </>
              )}

              <Button type="submit" disabled={loading || uploading}>
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
                  disabled={loading || uploading}
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
                  disabled={loading || uploading}
                  required
                />
              </div>
              <Button type="submit" disabled={loading || uploading}>
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