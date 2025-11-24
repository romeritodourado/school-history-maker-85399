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
  LogOut,
  Settings, // Importar o ícone de configurações
  User as UserIcon // Renomear User para evitar conflito com o tipo User do Supabase
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Municipality {
  id: string;
  name: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { signOut, user, profile, role, loading, activeMunicipalityIdForSuperAdmin, setActiveMunicipalityIdForSuperAdmin } = useAuth();
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [hasMunicipalities, setHasMunicipalities] = useState(false);

  useEffect(() => {
    if (!loading && user && role === 'super_admin') {
      fetchMunicipalities();
    }
  }, [loading, user, role]);

  const fetchMunicipalities = async () => {
    const { data, error } = await supabase
      .from('municipalities')
      .select('id, name')
      .order('name');
    
    if (error) {
      console.error('Error fetching municipalities:', error);
      return;
    }
    
    setMunicipalities(data || []);
    setHasMunicipalities(data && data.length > 0);
  };

  const handleSelectMunicipality = (municipalityId: string) => {
    setActiveMunicipalityIdForSuperAdmin(municipalityId);
  };

  const handleGoToMunicipalDashboard = () => {
    if (activeMunicipalityIdForSuperAdmin) {
      navigate(`/municipal-dashboard/${activeMunicipalityIdForSuperAdmin}`);
    }
  };

  const cards = [
    {
      title: 'Novo Histórico',
      description: 'Criar novo histórico escolar',
      icon: FileText,
      path: '/novo-historico',
      roles: ['municipal_admin', 'school_admin', 'secretary', 'teacher'],
    },
    {
      title: 'Lista de Alunos',
      description: 'Ver todos os alunos cadastrados',
      icon: Users,
      path: '/lista-alunos',
      roles: ['municipal_admin', 'school_admin', 'secretary', 'teacher'],
    },
    {
      title: 'Carga Horária',
      description: 'Gerenciar cargas horárias',
      icon: Clock,
      path: '/carga-horaria',
      roles: ['municipal_admin', 'school_admin', 'secretary'],
    },
    {
      title: 'Gerenciar Escolas',
      description: 'Administrar escolas da rede',
      icon: School,
      path: '/escolas',
      roles: ['municipal_admin'],
    },
    {
      title: 'Gerenciar Usuários',
      description: 'Criar e editar contas de usuários',
      icon: UserCog,
      path: '/usuarios',
      roles: ['municipal_admin', 'school_admin'],
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <UserIcon className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{profile?.name || user.email}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email} ({role})
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/account-settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Configurações da Conta
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {role === 'super_admin' ? (
          <div className="space-y-6">
            <Card className="mb-6 border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Gerenciar Redes Municipais
                </CardTitle>
                <CardDescription>
                  Como Super Administrador, você pode gerenciar as redes municipais ou selecionar uma para operar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!hasMunicipalities && (
                  <p className="text-muted-foreground">
                    Nenhuma rede municipal cadastrada ainda. Comece por aqui para configurar a primeira rede.
                  </p>
                )}
                <Button onClick={() => navigate('/municipal-network-setup')}>
                  Cadastrar Nova Rede Municipal
                </Button>
                {hasMunicipalities && (
                  <div className="space-y-2">
                    <Label htmlFor="select-municipality">Selecionar Rede Municipal</Label>
                    <Select
                      value={activeMunicipalityIdForSuperAdmin || ""}
                      onValueChange={handleSelectMunicipality}
                    >
                      <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="Selecione uma rede municipal" />
                      </SelectTrigger>
                      <SelectContent>
                        {municipalities.map((municipality) => (
                          <SelectItem key={municipality.id} value={municipality.id}>
                            {municipality.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {activeMunicipalityIdForSuperAdmin && (
                  <Button onClick={handleGoToMunicipalDashboard} className="mt-4">
                    Ir para o Dashboard Municipal
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((card) => {
              const Icon = card.icon;
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
        )}
      </main>
    </div>
  );
}