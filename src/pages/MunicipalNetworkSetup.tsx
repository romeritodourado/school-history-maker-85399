import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, ShieldCheck } from 'lucide-react';
import { z } from 'zod';
import { municipalitySchema, signupSchema } from '@/lib/validationSchemas';
import { useAuth } from '@/contexts/AuthContext';

type AppRole = 'super_admin' | 'municipal_admin' | 'school_admin' | 'secretary' | 'teacher';

const MunicipalNetworkSetup = () => {
  const [municipalityName, setMunicipalityName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [emblemUrl, setEmblemUrl] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Validate municipality data
      municipalitySchema.parse({ name: municipalityName, cnpj, emblem_url: emblemUrl });

      // 2. Validate admin user data
      signupSchema.parse({ email: adminEmail, password: adminPassword, name: adminName });

      // 3. Create Municipality
      const { data: municipalityData, error: municipalityError } = await supabase
        .from('municipalities')
        .insert([{ name: municipalityName, cnpj, emblem_url: emblemUrl }])
        .select()
        .single();

      if (municipalityError) throw municipalityError;

      // 4. Sign up Municipal Admin user
      const { error: signUpError } = await signUp(
        adminEmail,
        adminPassword,
        adminName,
        'municipal_admin',
        municipalityData.id
      );

      if (signUpError) throw signUpError;

      toast({
        title: 'Rede Municipal e Administrador criados com sucesso!',
        description: 'Você já pode fazer login com a conta do Administrador Municipal.',
      });

      navigate('/login');

    } catch (error) {
      toast({
        title: 'Erro ao configurar Rede Municipal',
        description: error instanceof z.ZodError ? error.errors[0].message : error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
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
          <div className="flex items-center justify-center mb-4">
            <Building2 className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            Cadastro de Rede Municipal
          </CardTitle>
          <CardDescription className="text-center">
            Preencha os dados da rede municipal e do seu primeiro administrador.
          </CardDescription>
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
                <Label htmlFor="emblemUrl">URL do Brasão/Logo</Label>
                <Input
                  id="emblemUrl"
                  type="url"
                  value={emblemUrl}
                  onChange={(e) => setEmblemUrl(e.target.value)}
                  placeholder="Ex: https://seusite.com/brasao.png"
                />
                <p className="text-xs text-muted-foreground">
                  (Opcional) URL de uma imagem para o brasão ou logo da rede municipal.
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