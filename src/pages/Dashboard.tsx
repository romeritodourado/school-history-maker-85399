import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Users, Clock, School, ShieldCheck, Building2, UserCog, LogOut, Settings, User as UserIcon, Loader2, Plus, Trash2, Edit } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import correctLogo from "/correct-logo.png";
import { ThemeToggle } from '@/components/ThemeToggle';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';

type AppRole = 'super_admin' | 'municipal_secretary' | 'network_manager' | 'school_admin' | 'secretary';

interface Municipality {
  id: string;
  name: string;
}

interface CustomRole {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { signOut, user, profile, role, loading, activeMunicipalityIdForSuperAdmin, setActiveMunicipalityIdForSuperAdmin } = useAuth();
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [hasMunicipalities, setHasMunicipalities] = useState(false);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingRoleName, setEditingRoleName] = useState('');
  const [editingRoleDescription, setEditingRoleDescription] = useState('');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (role === 'super_admin') {
      fetchMunicipalities();
      fetchCustomRoles();
    }
  }, [role]);

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

  const fetchCustomRoles = async () => {
    const { data, error } = await supabase
      .from('custom_roles')
      .select('*')
      .order('name');
    if (error) {
      console.error('Error fetching custom roles:', error);
      return;
    }
    setCustomRoles(data || []);
  };

  const handleSelectMunicipality = (municipalityId: string) => {
    setActiveMunicipalityIdForSuperAdmin(municipalityId);
  };

  const handleGoToMunicipalDashboard = () => {
    if (activeMunicipalityIdForSuperAdmin) {
      navigate(`/municipal-dashboard/${activeMunicipalityIdForSuperAdmin}`);
    }
  };

  const getRoleLabel = (role: AppRole | null) => {
    if (!role) return 'N/A';
    const labels: Record<AppRole, string> = {
      super_admin: 'Super Administrador',
      municipal_secretary: 'Secretário(a) Municipal',
      network_manager: 'Gerente de Estatísticas',
      school_admin: 'Diretor Escolar',
      secretary: 'Assistente Administrativo',
    };
    return labels[role] || role;
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      toast({
        title: "Erro",
        description: "O nome do cargo é obrigatório",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingRole(true);
    try {
      const { error } = await supabase
        .from('custom_roles')
        .insert([
          {
            name: newRoleName.trim(),
            description: newRoleDescription.trim() || null
          }
        ]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Cargo criado com sucesso"
      });

      setNewRoleName('');
      setNewRoleDescription('');
      fetchCustomRoles();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar o cargo",
        variant: "destructive"
      });
    } finally {
      setIsCreatingRole(false);
    }
  };

  const startEditingRole = (role: CustomRole) => {
    setEditingRoleId(role.id);
    setEditingRoleName(role.name);
    setEditingRoleDescription(role.description || '');
  };

  const cancelEditingRole = () => {
    setEditingRoleId(null);
    setEditingRoleName('');
    setEditingRoleDescription('');
  };

  const handleUpdateRole = async () => {
    if (!editingRoleId || !editingRoleName.trim()) {
      toast({
        title: "Erro",
        description: "O nome do cargo é obrigatório",
        variant: "destructive"
      });
      return;
    }

    setIsUpdatingRole(true);
    try {
      const { error } = await supabase
        .from('custom_roles')
        .update({
          name: editingRoleName.trim(),
          description: editingRoleDescription.trim() || null
        })
        .eq('id', editingRoleId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Cargo atualizado com sucesso"
      });

      cancelEditingRole();
      fetchCustomRoles();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o cargo",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o cargo "${roleName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      // Verificar se existem usuários com este cargo
      const { data: usersWithRole, error: countError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', roleName)
        .limit(1);

      if (countError) throw countError;

      if (usersWithRole && usersWithRole.length > 0) {
        toast({
          title: "Erro",
          description: `Não é possível excluir este cargo pois existem ${usersWithRole.length} usuário(s) atribuído(s) a ele.`,
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('custom_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Cargo excluído com sucesso"
      });

      fetchCustomRoles();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível excluir o cargo",
        variant: "destructive"
      });
    }
  };

  const cards = [
    {
      title: 'Novo Histórico',
      description: 'Criar novo histórico escolar',
      icon: FileText,
      path: '/novo-historico',
      roles: ['municipal_secretary', 'network_manager', 'school_admin', 'secretary'],
    },
    {
      title: 'Lista de Alunos',
      description: 'Ver todos os alunos cadastrados',
      icon: Users,
      path: '/lista-alunos',
      roles: ['municipal_secretary', 'network_manager', 'school_admin', 'secretary'],
    },
    {
      title: 'Carga Horária',
      description: 'Gerenciar cargas horárias',
      icon: Clock,
      path: '/carga-horaria',
      roles: ['municipal_secretary', 'network_manager', 'school_admin', 'secretary'],
    },
    {
      title: 'Gerenciar Escolas',
      description: 'Administrar escolas da rede',
      icon: School,
      path: '/escolas',
      roles: ['municipal_secretary', 'network_manager'],
    },
    {
      title: 'Gerenciar Usuários',
      description: 'Criar e editar contas de usuários',
      icon: UserCog,
      path: '/usuarios',
      roles: ['municipal_secretary', 'network_manager', 'school_admin'],
    },
    {
      title: 'Validar Histórico',
      description: 'Validar autenticidade de um histórico',
      icon: ShieldCheck,
      path: '/validar',
      roles: ['super_admin', 'municipal_secretary', 'network_manager', 'school_admin', 'secretary'],
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
          <Link to="/" className="flex items-center gap-4 p-2 rounded">
            <img src={correctLogo} alt="Correct Logo" className="h-16 w-16" />
            <div>
              <h1 className="text-2xl font-bold">Sistema de Históricos Escolares</h1>
              <p className="text-sm text-muted-foreground">
                Gestão simplificada de históricos escolares
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
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => navigate('/municipal-network-setup')}>
                    Cadastrar Nova Rede Municipal
                  </Button>
                  {hasMunicipalities && (
                    <Button onClick={() => navigate('/manage-municipalities')} variant="secondary">
                      Gerenciar Redes Existentes
                    </Button>
                  )}
                </div>
                {hasMunicipalities && (
                  <div className="space-y-2">
                    <Label htmlFor="select-municipality">Selecionar Rede Municipal</Label>
                    <Select value={activeMunicipalityIdForSuperAdmin || ""} onValueChange={handleSelectMunicipality}>
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

            {/* Gerenciamento de Cargos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <UserCog className="h-5 w-5" />
                    Gerenciar Cargos do Sistema
                  </span>
                </CardTitle>
                <CardDescription>
                  Crie e gerencie cargos personalizados para os usuários do sistema.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Formulário para criar novo cargo */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-4">Criar Novo Cargo</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="roleName">Nome do Cargo *</Label>
                        <Input
                          id="roleName"
                          value={newRoleName}
                          onChange={(e) => setNewRoleName(e.target.value)}
                          placeholder="Ex: Coordenador Pedagógico"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="roleDescription">Descrição (Opcional)</Label>
                        <Textarea
                          id="roleDescription"
                          value={newRoleDescription}
                          onChange={(e) => setNewRoleDescription(e.target.value)}
                          placeholder="Descrição do cargo"
                          className="min-h-[100px]"
                        />
                      </div>
                      <Button 
                        onClick={handleCreateRole} 
                        disabled={isCreatingRole || !newRoleName.trim()}
                        className="w-full"
                      >
                        {isCreatingRole ? "Criando..." : "Criar Cargo"}
                      </Button>
                    </div>
                  </div>

                  {/* Listagem de cargos existentes */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-4">Cargos Existentes</h3>
                    {customRoles.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">
                        Nenhum cargo personalizado cadastrado ainda.
                      </p>
                    ) : (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                        {customRoles.map((role) => (
                          <div key={role.id} className="border rounded-lg p-3">
                            {editingRoleId === role.id ? (
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <Label htmlFor={`edit-role-name-${role.id}`}>Nome do Cargo *</Label>
                                  <Input
                                    id={`edit-role-name-${role.id}`}
                                    value={editingRoleName}
                                    onChange={(e) => setEditingRoleName(e.target.value)}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`edit-role-desc-${role.id}`}>Descrição (Opcional)</Label>
                                  <Textarea
                                    id={`edit-role-desc-${role.id}`}
                                    value={editingRoleDescription}
                                    onChange={(e) => setEditingRoleDescription(e.target.value)}
                                    className="min-h-[80px]"
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={cancelEditingRole}
                                    disabled={isUpdatingRole}
                                  >
                                    Cancelar
                                  </Button>
                                  <Button 
                                    size="sm"
                                    onClick={handleUpdateRole}
                                    disabled={isUpdatingRole || !editingRoleName.trim()}
                                  >
                                    {isUpdatingRole ? "Salvando..." : "Salvar"}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium">{role.name}</h4>
                                  {role.description && (
                                    <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Criado em: {new Date(role.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="flex gap-1 ml-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => startEditingRole(role)}
                                    className="h-8 w-8"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteRole(role.id, role.name)}
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((card) => {
              const Icon = card.icon;
              if (card.roles && role && card.roles.includes(role)) {
                return (
                  <Card key={card.path} className="cursor-pointer transition-all hover:shadow-lg hover:scale-105"
                    onClick={() => navigate(card.path)}>
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