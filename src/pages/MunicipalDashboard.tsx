import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
  FileText, 
  Users, 
  Clock, 
  School, 
  UserCog,
  ArrowLeft,
  Building2,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import correctLogo from "/correct-logo.png";

interface SchoolOption {
  id: string;
  name: string;
}

export default function MunicipalDashboard() {
  const navigate = useNavigate();
  const { municipalityId } = useParams<{ municipalityId: string }>();
  const { role, setActiveMunicipalityIdForSuperAdmin } = useAuth();
  const { toast } = useToast();

  const [municipalityName, setMunicipalityName] = useState<string | null>(null);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [activeSchoolId, setActiveSchoolId] = useState<string | null>(null);

  useEffect(() => {
    if (role !== 'super_admin' || !municipalityId) {
      navigate('/'); // Redirect if not super_admin or no municipalityId
      return;
    }
    fetchMunicipalityDetails();
    fetchSchoolsForMunicipality();
  }, [municipalityId, role, navigate]);

  const fetchMunicipalityDetails = async () => {
    const { data, error } = await supabase
      .from('municipalities')
      .select('name')
      .eq('id', municipalityId)
      .single();

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os detalhes da rede municipal.',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }
    setMunicipalityName(data?.name || 'Rede Municipal Desconhecida');
  };

  const fetchSchoolsForMunicipality = async () => {
    const { data, error } = await supabase
      .from('schools')
      .select('id, name')
      .eq('municipality_id', municipalityId)
      .order('name');

    if (error) {
      console.error('Error fetching schools:', error);
      return;
    }
    setSchools(data || []);
  };

  const handleBackToSuperAdminDashboard = () => {
    setActiveMunicipalityIdForSuperAdmin(null); // Clear active municipality
    navigate('/');
  };

  const cards = [
    {
      title: 'Novo Histórico',
      description: 'Criar novo histórico escolar',
      icon: FileText,
      path: '/novo-historico',
      requiresSchool: true,
    },
    {
      title: 'Lista de Alunos',
      description: 'Ver todos os alunos cadastrados',
      icon: Users,
      path: '/lista-alunos',
      requiresSchool: true,
    },
    {
      title: 'Carga Horária',
      description: 'Gerenciar cargas horárias',
      icon: Clock,
      path: '/carga-horaria',
      requiresSchool: false, // Workload can be municipal level
    },
    {
      title: 'Gerenciar Escolas',
      description: 'Administrar escolas da rede',
      icon: School,
      path: '/escolas',
      requiresSchool: false,
    },
    {
      title: 'Gerenciar Usuários',
      description: 'Criar e editar contas de usuários',
      icon: UserCog,
      path: '/usuarios',
      requiresSchool: false,
    },
    {
      title: 'Validar Histórico',
      description: 'Validar autenticidade de um histórico',
      icon: ShieldCheck,
      path: '/validar',
      requiresSchool: false, // Public route
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 p-2 rounded">
            <img src={correctLogo} alt="Correct Logo" className="h-16 w-16" />
            <div>
              <h1 className="text-2xl font-bold">Dashboard Municipal</h1>
              <p className="text-sm text-muted-foreground">
                {municipalityName ? `Operando em: ${municipalityName}` : 'Carregando...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={handleBackToSuperAdminDashboard}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Super Admin
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="h-5 w-5" />
              Selecionar Escola (Opcional)
            </CardTitle>
            <CardDescription>
              Selecione uma escola para realizar ações específicas a ela.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="select-school">Escola</Label>
              <Select
                value={activeSchoolId || ""}
                onValueChange={(value) => setActiveSchoolId(value)}
              >
                <SelectTrigger className="w-full md:w-[300px]">
                  <SelectValue placeholder="Selecione uma escola" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => {
            const Icon = card.icon;
            const isDisabled = card.requiresSchool && !activeSchoolId;
            const tooltipText = card.requiresSchool && !activeSchoolId ? "Selecione uma escola para habilitar" : "";

            return (
              <Card 
                key={card.path}
                className={`cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !isDisabled && navigate(card.path)}
                title={tooltipText}
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
      </main>
    </div>
  );
}