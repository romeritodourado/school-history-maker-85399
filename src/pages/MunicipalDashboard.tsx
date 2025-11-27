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
  ShieldCheck,
  Info,
  Loader2,
  LogOut,
  Settings,
  User as UserIcon
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import correctLogo from "/correct-logo.png";
import { ThemeToggle } from '@/components/ThemeToggle';

type AppRole = 'super_admin' | 'municipal_secretary' | 'network_manager' | 'school_admin' | 'secretary' | 'assistente_administrativo';

interface SchoolOption {
  id: string;
  name: string;
}

interface SelectedSchoolDetails {
  id: string;
  name: string;
  inep: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  logo_url: string | null;
  authorization_decree_url: string | null;
  official_gazette_url: string | null;
}

interface MunicipalityDetails {
  id: string;
  name: string;
  cnpj: string | null;
  emblem_url: string | null;
  address: string | null;
  city: string | null; // Adicionado
  state: string | null; // Adicionado
}

export default function MunicipalDashboard() {
  const navigate = useNavigate();
  const { municipalityId: paramMunicipalityId } = useParams<{ municipalityId: string }>();
  const { user, profile, role, signOut, setActiveMunicipalityIdForSuperAdmin } = useAuth();
  const { toast } = useToast();

  const [municipalityDetails, setMunicipalityDetails] = useState<MunicipalityDetails | null>(null);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null); // Inicializado como null
  const [selectedSchoolDetails, setSelectedSchoolDetails] = useState<SelectedSchoolDetails | null>(null);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [loadingSchoolDetails, setLoadingSchoolDetails] = useState(false);

  const currentMunicipalityId = role === 'super_admin' ? paramMunicipalityId : profile?.municipality_id;

  useEffect(() => {
    if (!currentMunicipalityId) {
      toast({
        title: 'Erro de acesso',
        description: 'ID da rede municipal não encontrado. Redirecionando.',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    if (role !== 'super_admin' && role !== 'municipal_secretary' && role !== 'network_manager') {
      navigate('/');
      return;
    }

    fetchMunicipalityDetails(currentMunicipalityId);
    fetchSchoolsForMunicipality(currentMunicipalityId);
  }, [currentMunicipalityId, role, navigate]);

  useEffect(() => {
    if (selectedSchoolId) {
      fetchSelectedSchoolDetails(selectedSchoolId);
    } else {
      setSelectedSchoolDetails(null); // Limpar detalhes se nenhuma escola estiver selecionada
    }
  }, [selectedSchoolId]);

  const fetchMunicipalityDetails = async (id: string) => {
    const { data, error } = await supabase
      .from('municipalities')
      .select('id, name, cnpj, emblem_url, address, city, state') // Incluído 'city' e 'state' na seleção
      .eq('id', id)
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
    setMunicipalityDetails(data as MunicipalityDetails);
  };

  const fetchSchoolsForMunicipality = async (id: string) => {
    setLoadingSchools(true);
    const { data, error } = await supabase
      .from('schools')
      .select('id, name')
      .eq('municipality_id', id)
      .order('name');

    if (error) {
      console.error('Error fetching schools:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as escolas.',
        variant: 'destructive',
      });
      setSchools([]);
    } else {
      setSchools(data || []);
      // Removida a lógica de pré-seleção automática
      setSelectedSchoolId(null); 
    }
    setLoadingSchools(false);
  };

  const fetchSelectedSchoolDetails = async (schoolId: string) => {
    setLoadingSchoolDetails(true);
    const { data, error } = await supabase
      .from('schools')
      .select('id, name, inep, address, city, state, logo_url, authorization_decree_url, official_gazette_url')
      .eq('id', schoolId)
      .single();

    if (error) {
      console.error('Error fetching school details:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os detalhes da escola selecionada.',
        variant: 'destructive',
      });
      setSelectedSchoolDetails(null);
    } else {
      setSelectedSchoolDetails(data as SelectedSchoolDetails);
    }
    setLoadingSchoolDetails(false);
  };

  const handleBackToSuperAdminDashboard = () => {
    setActiveMunicipalityIdForSuperAdmin(null);
    navigate('/');
  };

  const getRoleLabel = (role: AppRole | null) => {
    if (!role) return 'N/A';
    const labels: Record<AppRole, string> = {
      super_admin: 'Super Administrador',
      municipal_secretary: 'Secretário(a) Municipal',
      network_manager: 'Gerente de Estatísticas',
      school_admin: 'Diretor Escolar',
      secretary: 'Secretário(a) Escolar',
      assistente_administrativo: 'Assistente Administrativo',
    };
    return labels[role] || role;
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
      requiresSchool: false,
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
      requiresSchool: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-4 p-2 rounded"> {/* Adicionado Link aqui */}
            <img src={correctLogo} alt="Correct Logo" className="h-16 w-16" />
            <div>
              <h1 className="text-2xl font-bold">Dashboard Municipal</h1>
              <p className="text-sm text-muted-foreground">
                {municipalityDetails?.name ? `Operando em: ${municipalityDetails.name}` : 'Carregando...'}
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            {user && (
              <>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <UserIcon className="h-4 w-4" />
                  Olá, <span className="font-medium">{profile?.name || user.email}</span> (<span className="font-medium">{getRoleLabel(role)}</span>)
                </div>
                <Button variant="outline" onClick={() => navigate('/account-settings')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Configurações da Conta
                </Button>
                <ThemeToggle />
                <Button variant="outline" onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </Button>
              </>
            )}
            {role === 'super_admin' && (
              <Button variant="outline" onClick={handleBackToSuperAdminDashboard}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para Super Admin
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {municipalityDetails && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardHeader>
              <div className="flex items-center gap-4">
                {municipalityDetails.emblem_url && (
                  <img 
                    src={municipalityDetails.emblem_url} 
                    alt="Brasão da Rede Municipal" 
                    className="h-20 w-20 object-contain"
                  />
                )}
                <div className="flex-1 space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {municipalityDetails.name}
                  </CardTitle>
                  <CardDescription>
                    Informações da Secretaria Municipal de Educação
                  </CardDescription>
                  {municipalityDetails.cnpj && (
                    <p className="text-sm text-muted-foreground"><span className="font-semibold">CNPJ:</span> {municipalityDetails.cnpj}</p>
                  )}
                  {municipalityDetails.address && (
                    <p className="text-sm text-muted-foreground"><span className="font-semibold">Endereço:</span> {municipalityDetails.address}</p>
                  )}
                  {municipalityDetails.city && municipalityDetails.state && ( // Exibindo cidade e estado
                    <p className="text-sm text-muted-foreground"><span className="font-semibold">Localização:</span> {municipalityDetails.city} - {municipalityDetails.state}</p>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <School className="h-5 w-5" />
                Selecionar Escola (Obrigatório para algumas ações)
              </CardTitle>
              <CardDescription>
                Selecione uma escola para realizar ações específicas a ela.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSchools ? (
                <div className="flex items-center justify-center text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando escolas...
                </div>
              ) : schools.length === 0 ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Info className="h-4 w-4" /> Nenhuma escola encontrada para esta rede municipal.
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="select-school">Escola</Label>
                  <Select
                    value={selectedSchoolId || ""}
                    onValueChange={(value) => setSelectedSchoolId(value)}
                  >
                    <SelectTrigger className="w-full">
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
              )}
            </CardContent>
          </Card>

          {selectedSchoolDetails && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {selectedSchoolDetails.logo_url && (
                    <img src={selectedSchoolDetails.logo_url} alt="Logo da Escola" className="h-6 w-6 object-contain" />
                  )}
                  {selectedSchoolDetails.name}
                </CardTitle>
                <CardDescription>Detalhes da Escola Selecionada</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {loadingSchoolDetails ? (
                  <div className="flex items-center justify-center text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando detalhes...
                  </div>
                ) : (
                  <>
                    {selectedSchoolDetails.inep && (
                      <p><span className="font-semibold">INEP:</span> {selectedSchoolDetails.inep}</p>
                    )}
                    {selectedSchoolDetails.address && (
                      <p><span className="font-semibold">Endereço:</span> {selectedSchoolDetails.address}</p>
                    )}
                    {selectedSchoolDetails.city && selectedSchoolDetails.state && (
                      <p><span className="font-semibold">Localização:</span> {selectedSchoolDetails.city} - {selectedSchoolDetails.state}</p>
                    )}
                    {selectedSchoolDetails.authorization_decree_url && (
                      <p><span className="font-semibold">Decreto de Autorização:</span> {selectedSchoolDetails.authorization_decree_url}</p>
                    )}
                    {selectedSchoolDetails.official_gazette_url && (
                      <p><span className="font-semibold">Diário Oficial:</span> {selectedSchoolDetails.official_gazette_url}</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => {
            const Icon = card.icon;
            const isDisabled = card.requiresSchool && !selectedSchoolId;
            const tooltipText = card.requiresSchool && !selectedSchoolId ? "Selecione uma escola para habilitar" : "";

            let cardPath = card.path;
            if (card.requiresSchool && selectedSchoolId) {
              cardPath = `${card.path}?schoolId=${selectedSchoolId}`;
            } else if (!card.requiresSchool && currentMunicipalityId) {
              cardPath = `${card.path}?municipalityId=${currentMunicipalityId}`;
            }

            return (
              <Card 
                key={card.path}
                className={`cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !isDisabled && navigate(cardPath)}
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