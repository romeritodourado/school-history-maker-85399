import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, 
  Users, 
  Download, 
  Clock, 
  School, 
  LogOut,
  UserCog,
  ShieldCheck
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, profile, role, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const cards = [
    {
      title: 'Novo Histórico',
      description: 'Criar novo histórico escolar',
      icon: FileText,
      path: '/novo-historico',
      roles: ['superadmin', 'adminrede', 'diretor', 'secretario', 'assistente'],
    },
    {
      title: 'Lista de Alunos',
      description: 'Ver todos os alunos cadastrados',
      icon: Users,
      path: '/lista-alunos',
      roles: ['superadmin', 'adminrede', 'diretor', 'secretario', 'assistente'],
    },
    {
      title: 'Carga Horária',
      description: 'Gerenciar cargas horárias',
      icon: Clock,
      path: '/carga-horaria',
      roles: ['superadmin', 'adminrede', 'diretor', 'secretario'],
    },
    {
      title: 'Gerenciar Escolas',
      description: 'Administrar escolas da rede',
      icon: School,
      path: '/escolas',
      roles: ['superadmin', 'adminrede'],
    },
    {
      title: 'Gerenciar Usuários',
      description: 'Criar e editar usuários',
      icon: UserCog,
      path: '/usuarios',
      roles: ['superadmin', 'adminrede', 'diretor'],
    },
  ];

  const visibleCards = cards.filter(card => 
    card.roles.includes(role || '')
  );

  const getRoleLabel = (role: string | null) => {
    const labels: Record<string, string> = {
      superadmin: 'Super Administrador',
      adminrede: 'Administrador da Rede',
      diretor: 'Diretor Escolar',
      secretario: 'Secretário Escolar',
      assistente: 'Assistente Administrativo',
    };
    return labels[role || ''] || 'Sem cargo';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Sistema de Históricos Escolares</h1>
            <p className="text-sm text-muted-foreground">
              {profile?.full_name} • {getRoleLabel(role)}
            </p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleCards.map((card) => {
            const Icon = card.icon;
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
          })}
        </div>

        {role === 'superadmin' && (
          <Card className="mt-8 border-primary/20">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <CardTitle>Painel do Super Administrador</CardTitle>
              </div>
              <CardDescription>
                Você tem acesso total ao sistema. Use com responsabilidade.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </main>
    </div>
  );
}
