import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, ShieldCheck, UploadCloud, Trash2, ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { municipalitySchema, signupSchema } from '@/lib/validationSchemas';
import { useAuth } from '@/contexts/AuthContext';
import { Progress } from '@/components/ui/progress';

type AppRole = 'super_admin' | 'municipal_admin' | 'school_admin' | 'secretary' | 'assistente_administrativo';

const MunicipalNetworkSetup = () => {
  const [municipalityName, setMunicipalityName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [emblemFile, setEmblemFile] = useState<File | null>(null);
  const [uploadedEmblemUrl, setUploadedEmblemUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSuperAdmin, setHasSuperAdmin] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signUp } = useAuth();

  useEffect(() => {
    checkSuperAdminExists();
  }, []);

  const checkSuperAdminExists = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'super_admin')
      .limit(1);

    if (data && data.length > 0) {
      setHasSuperAdmin(true);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setEmblemFile(file);
      await uploadEmblem(file);
    }
  };

  const uploadEmblem = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    setUploadedEmblemUrl(null);

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `emblems/${fileName}`;

    try {
      const { data, error } = await supabase.storage
        .from('municipality_emblems')
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
        .from('municipality_emblems')
        .getPublicUrl(filePath);

      setUploadedEmblemUrl(publicUrlData.publicUrl);
      toast({
        title: 'Upload de brasão concluído!',
        description: 'A imagem foi enviada com sucesso.',
      });
    } catch (error: any) {
      console.error('Error uploading emblem:', error);
      toast({
        title: 'Erro no upload do brasão',
        description: error.message || 'Não foi possível enviar a imagem.',
        variant: 'destructive',
      });
      setEmblemFile(null);
      setUploadedEmblemUrl(null);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeEmblem = () => {
    setEmblemFile(null);
    setUploadedEmblemUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Validate municipality data
      console.log('Validando dados da rede municipal...');
      municipalitySchema.parse({ name: municipalityName, cnpj, emblem_url: uploadedEmblemUrl || '' });
      console.log('Dados da rede municipal validados.');

      // 2. Validate admin user data
      console.log('Validando dados do administrador...');
      signupSchema.parse({ email: adminEmail, password: adminPassword, name: adminName });
      console.log('Dados do administrador validados.');

      // 3. Create Municipality
      console.log('Criando rede municipal no Supabase...');
      const { data: municipalityData, error: municipalityError } = await supabase
        .from('municipalities')
        .insert([{ name: municipalityName, cnpj, emblem_url: uploadedEmblemUrl }])
        .select()
        .single();

      if (municipalityError) {
        console.error('Erro ao criar rede municipal:', municipalityError);
        throw new Error(municipalityError.message || 'Erro desconhecido ao criar rede municipal.');
      }
      console.log('Rede municipal criada:', municipalityData);

      // 4. Sign up Municipal Admin user
      console.log('Criando usuário administrador municipal...');
      const { error: signUpError } = await signUp(
        adminEmail,
        adminPassword,
        adminName,
        'municipal_admin',
        municipalityData.id
      );

      if (signUpError) {
        console.error('Erro ao cadastrar administrador municipal:', signUpError);
        throw new Error(signUpError.message || 'Erro desconhecido ao cadastrar administrador municipal.');
      }
      console.log('Administrador municipal cadastrado com sucesso.');

      toast({
        title: 'Rede Municipal e Administrador criados com sucesso!',
        description: 'Você já pode fazer login com a conta do Administrador Municipal.',
      });

      navigate('/login');

    } catch (error) {
      console.error('Erro geral no handleSubmit:', error);
      toast({
        title: 'Erro ao configurar Rede Municipal',
        description: error instanceof z.ZodError ? error.errors[0].message : error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      console.log('handleSubmit finalizado, loading set to false.');
    }
  };

  if (!hasSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <ShieldCheck className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-center">
              Configuração Inicial do Sistema
            </CardTitle>
            <CardDescription className="text-center">
              Crie sua conta de Super Administrador
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              Para configurar a primeira rede municipal, um Super Administrador precisa ser criado primeiro.
            </p>
            <Button onClick={() => navigate('/initial-superadmin-setup')} className="w-full mt-4">
              Criar Super Administrador
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between mb-4">
            <Link to="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <div className="flex-1 text-center">
              <Building2 className="h-12 w-12 text-primary mx-auto mb-2" />
              <CardTitle className="text-2xl font-bold">
                Cadastro de Rede Municipal
              </CardTitle>
              <CardDescription>
                Preencha os dados da rede municipal e do seu primeiro administrador.
              </CardDescription>
            </div>
            <div className="w-[70px]"></div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <fieldset className="space-y-4 border p-4 rounded-lg">
              <legend className="text-lg font-semibold px-2">Dados da Rede Municipal</legend>
              <div className="space-y-2">
                <Label htmlFor="municipalityName">Nome da Rede Municipal *</Label>
                <Input
                  id="municipalityName"
                  value={municipalityName}
                  onChange={(e) => setMunicipalityName(e.target.value)}
                  placeholder="Ex: Secretaria Municipal de Educação de LEM"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ da Rede Municipal</Label>
                <Input
                  id="cnpj"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="Ex: 00.000.000/0001-00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emblemFile">Brasão/Logo da Rede Municipal</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="emblemFile"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    className="flex-1"
                    disabled={uploading}
                  />
                  {uploadedEmblemUrl && (
                    <Button variant="destructive" size="icon" onClick={removeEmblem} disabled={uploading}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {uploading && (
                  <Progress value={uploadProgress} className="w-full mt-2" />
                )}
                {uploadedEmblemUrl && (
                  <div className="mt-4 flex items-center space-x-4">
                    <img src={uploadedEmblemUrl} alt="Brasão da Rede Municipal" className="h-20 w-20 object-contain border rounded-md" />
                    <p className="text-sm text-muted-foreground">Imagem carregada: {emblemFile?.name}</p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  (Opcional) Faça o upload de uma imagem para o brasão ou logo da rede municipal.
                </p>
              </div>
            </fieldset>

            <fieldset className="space-y-4 border p-4 rounded-lg">
              <legend className="text-lg font-semibold px-2">Dados do Administrador Municipal (Secretário de Educação)</legend>
              <div className="space-y-2">
                <Label htmlFor="adminName">Nome Completo *</Label>
                <Input
                  id="adminName"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Nome completo do Secretário de Educação"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminEmail">Email *</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="email@municipio.com.br"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminPassword">Senha *</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <p className="text-xs text-muted-foreground">
                  A senha deve ter pelo menos 8 caracteres, incluindo letras maiúsculas, minúsculas e números.
                </p>
              </div>
            </fieldset>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Building2 className="mr-2 h-4 w-4" />
                  Cadastrar Rede e Administrador
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default MunicipalNetworkSetup;