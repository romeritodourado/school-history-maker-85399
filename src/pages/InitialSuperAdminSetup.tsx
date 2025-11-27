import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck } from 'lucide-react';
import { z } from 'zod';
import { signupSchema } from '@/lib/validationSchemas';
import { useAuth } from '@/contexts/AuthContext';

type AppRole = 'super_admin' | 'municipal_secretary' | 'network_manager' | 'school_admin' | 'secretary' | 'assistente_administrativo';

export default function InitialSuperAdminSetup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false); // Para submissão do formulário
  const [pageLoading, setPageLoading] = useState(true); // Para verificações iniciais
  const [superAdminExists, setSuperAdminExists] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signUp, user, loading: authLoading, role } = useAuth(); // Obter estado de autenticação

  useEffect(() => {
    const checkSetupStatus = async () => {
      if (authLoading) {
        // Ainda carregando o estado de autenticação, aguardar
        return;
      }

      if (user) {
        // Usuário já está logado, redirecionar para o dashboard
        toast({
          title: 'Você já está logado',
          description: 'Redirecionando para o dashboard.',
        });
        navigate('/', { replace: true });
        return;
      }

      // Nenhum usuário logado, verificar se um super admin existe no DB
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'super_admin')
        .limit(1);

      if (error) {
        console.error('Erro ao verificar status do super admin:', error);
        toast({
          title: 'Erro ao verificar status do sistema',
          description: 'Não foi possível determinar se um Super Administrador já existe.',
          variant: 'destructive',
        });
        setPageLoading(false);
        return;
      }

      if (data && data.length > 0) {
        setSuperAdminExists(true);
        toast({
          title: 'Super Administrador já existe',
          description: 'Redirecionando para o login.',
        });
        navigate('/login', { replace: true });
      } else {
        setSuperAdminExists(false); // Explicitamente definir como false se não encontrado
      }
      setPageLoading(false);
    };

    checkSetupStatus();
  }, [authLoading, user, navigate, toast]); // Depender de authLoading e user

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      signupSchema.parse({ email, password, name });

      const { error } = await signUp(email, password, name, 'super_admin');

      if (error) throw error;

      toast({
        title: 'Conta Super Administrador criada com sucesso!',
        description: 'Você já pode fazer login.',
      });

      navigate('/login');
    } catch (error) {
      toast({
        title: 'Erro ao criar conta',
        description: error instanceof z.ZodError ? error.errors[0].message : error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading || authLoading) { // Mostrar carregando se a página estiver verificando ou a autenticação estiver carregando
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Verificando status do sistema...</p>
      </div>
    );
  }

  // Se superAdminExists for true, já deveríamos ter redirecionado.
  // Esta condição idealmente não deve ser alcançada se os redirecionamentos funcionarem.
  if (superAdminExists) {
    return null; // Ou um fallback, mas o redirecionamento deve lidar com isso
  }

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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  minLength={8}
                />
                <p className="text-xs text-muted-foreground">
                  A senha deve ter pelo menos 8 caracteres, incluindo letras maiúsculas, minúsculas e números.
                </p>
              </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Criar Conta Super Administrador
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}