import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, 
  Users, 
  Clock, 
  School, 
  ShieldCheck,
  Building2,
  UserCog,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function Dashboard() {
  const navigate = useNavigate();
  const { signOut, user, profile, role, loading } = useAuth();
  const [hasMunicipalities, setHasMunicipalities] = useState(false);

  useEffect(() => {
    if (!loading && user && role === 'super_admin') {
      checkMunicipalities();
    }
  }, [loading, user, role]);

  const checkMunicipalities = async () => {
    const { data, error } = await supabase
      .from('municipalities')
      .select('id')
      .limit(1);
    
    if (data && data.length > 0) {
      setHasMunicipalities(true);
    } else {
      setHasMunicipalities(false);
    }
  };

  const cards = [
    {
      title: 'Novo Histórico',
      description: 'Criar novo histórico escolar',
      icon: FileText,
      path: '/novo-historico',
      roles: ['super_admin', 'municipal_admin', 'school_admin', 'secretary', 'teacher'],
    },
    {
      title: 'Lista de Alunos',
      description: 'Ver todos os alunos cadastrados',
      icon: Users,
      path: '/lista-alunos',
      roles: ['super_admin', 'municipal_admin', 'school_admin', 'secretary', 'teacher'],
    },
    {
      title: 'Carga Horária',
      description: 'Gerenciar cargas horárias',
      icon: Clock,
      path: '/carga-horaria',
      roles: ['super_admin', 'municipal_admin', 'school_admin', 'secretary'],
    },
    {
      title: 'Gerenciar Escolas',
      description: 'Administrar escolas da rede',
      icon: School,
      path: '/escolas',
      roles: ['super_admin', 'municipal_admin'],
    },
    {
      title: 'Gerenciar Usuários',
      description: 'Criar e editar contas de usuários',
      icon: UserCog,
      path: '/usuarios',
      roles: ['super_admin', 'municipal_admin', 'school_admin'],
    },
    {
      title: 'Validar Histórico',
      description: 'Validar autenticidade de um histórico',
      icon: ShieldCheck,
      path: '/validar',
      roles: ['super_admin', 'municipal_admin', 'school_admin', 'secretary', 'teacher'], // Public route, but can be listed here
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 p-2 rounded">
            <img src="/correct-logo.png" alt="Correct Logo" className="h-16 w-16" />
            <div>
              <h1 className="text-2xl font-bold">Sistema de Históricos Escolares</h1>
              <p className="text-sm text-muted-foreground">
                Gestão simplificada de históricos escolares
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <div className="text-sm text-muted-foreground">
                Olá, {profile?.name || user.email}! ({role})
              </div>
            )}
            <Button variant="outline" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {role === 'super_admin' && !hasMunicipalities && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Configurar Rede Municipal
              </CardTitle>
              <CardDescription>
                Parece que nenhuma rede municipal foi cadastrada ainda. Comece por aqui para configurar a primeira rede e seu administrador.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/municipal-network-setup')}>
                Cadastrar Rede Municipal
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => {
            const Icon = card.icon;
            // Only render cards if the user has the required role, or if it's a public route
            if (card.roles && role && card.roles.includes(role)) {
              return (
                <Card 
                  key={card.path}
                  className="cursor-pointer transition-all hover:shadow-lg hover:scale-105"
                  onClick={() => navigate(card.path)}
                >
                  <CardHeader>
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle>{card.title}</CardTitle>
                    </div>
                    <CardDescription>{card.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            }
            return null;
          })}
        </div>
      </main>
    </div>
  );
}