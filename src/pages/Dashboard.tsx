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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { NotificationsBell } from '@/components/NotificationsBell'; // Importar o sino de notificações

type AppRole = 'super_admin' | 'municipal_secretary' | 'network_manager' | 'school_admin' | 'secretary';

interface Municipality {
  id: string;
  name: string;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface CustomRole {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  scope: 'global' | 'municipal';
  municipality_id: string | null;
  municipality_name?: string;
  permissions: string[];
}

// Definição dos cargos padrão do sistema
const systemRoles = [
  { 
    id: 'super_admin', 
    name: 'Super Administrador',
    description: 'Administrador do sistema com acesso total',
    isSystemRole: true
  },
  { 
    id: 'municipal_secretary', 
    name: 'Secretário(a) Municipal',
    description: 'Responsável pela gestão municipal de ensino',
    isSystemRole: true
  },
  { 
    id: 'network_manager', 
    name: 'Gerente de Estatísticas',
    description: 'Responsável pelas estatísticas e dados da rede',
    isSystemRole: true
  },
  { 
    id: 'school_admin', 
    name: 'Diretor Escolar',
    description: 'Responsável pela administração escolar',
    isSystemRole: true
  },
  { 
    id: 'secretary', 
    name: 'Secretário(a) Escolar', // Nome atualizado
    description: 'Auxiliar administrativo da escola',
    isSystemRole: true
  }
];

// Definição das permissões disponíveis no sistema
const availablePermissions: Permission[] = [
  {
    id: 'create_student',
    name: 'Criar Alunos',
    description: 'Permite criar novos registros de alunos',
    category: 'Alunos'
  },
  {
    id: 'edit_student',
    name: 'Editar Alunos',
    description: 'Permite editar informações de alunos existentes',
    category: 'Alunos'
  },
  {
    id: 'delete_student',
    name: 'Excluir Alunos',
    description: 'Permite excluir registros de alunos',
    category: 'Alunos'
  },
  {
    id: 'view_student_list',
    name: 'Visualizar Lista de Alunos',
    description: 'Permite visualizar a lista de alunos',
    category: 'Alunos'
  },
  {
    id: 'create_transcript',
    name: 'Criar Históricos',
    description: 'Permite criar novos históricos escolares',
    category: 'Históricos'
  },
  {
    id: 'edit_transcript',
    name: 'Editar Históricos',
    description: 'Permite editar históricos escolares existentes',
    category: 'Históricos'
  },
  {
    id: 'delete_transcript',
    name: 'Excluir Históricos',
    description: 'Permite excluir históricos escolares',
    category: 'Históricos'
  },
  {
    id: 'export_transcript',
    name: 'Exportar Históricos',
    description: 'Permite exportar históricos em PDF ou Excel',
    category: 'Históricos'
  },
  {
    id: 'view_transcript',
    name: 'Visualizar Históricos',
    description: 'Permite visualizar históricos escolares',
    category: 'Históricos'
  },
  {
    id: 'manage_workload',
    name: 'Gerenciar Carga Horária',
    description: 'Permite configurar disciplinas e cargas horárias',
    category: 'Configurações'
  },
  {
    id: 'manage_schools',
    name: 'Gerenciar Escolas',
    description: 'Permite criar e editar escolas',
    category: 'Configurações'
  },
  {
    id: 'manage_users',
    name: 'Gerenciar Usuários',
    description: 'Permite criar e editar contas de usuários',
    category: 'Configurações'
  },
  {
    id: 'validate_transcript',
    name: 'Validar Históricos',
    description: 'Permite validar a autenticidade de históricos',
    category: 'Validação'
  }
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { signOut, user, profile, role, loading, activeMunicipalityIdForSuperAdmin, setActiveMunicipalityIdForSuperAdmin } = useAuth();
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [hasMunicipalities, setHasMunicipalities] = useState(false);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [newRoleScope, setNewRoleScope] = useState<'global' | 'municipal'>('global');
  const [newRoleMunicipalityId, setNewRoleMunicipalityId] = useState<string>('');
  const [newRolePermissions, setNewRolePermissions] = useState<string[]>([]);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingRoleName, setEditingRoleName] = useState('');
  const [editingRoleDescription, setEditingRoleDescription] = useState('');
  const [editingRoleScope, setEditingRoleScope] = useState<'global' | 'municipal'>('global');
  const [editingRoleMunicipalityId, setEditingRoleMunicipalityId] = useState<string>('');
  const [editingRolePermissions, setEditingRolePermissions] = useState<string[]>([]);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingRole, setIsDeletingRole] = useState(false);
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
      .select(`
        *,
        municipalities (name)
      `)
      .order('name');
    if (error) {
      console.error('Error fetching custom roles:', error);
      return;
    }
    
    const rolesWithMunicipalityName = (data || []).map(role => ({
      ...role,
      municipality_name: (role.municipalities as { name: string } | null)?.name || null
    }));
    
    setCustomRoles(rolesWithMunicipalityName as CustomRole[]);
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
      secretary: 'Secretário(a) Escolar', // Nome atualizado aqui
    };
    return labels[role] || role;
  };

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    if (editingRoleId) {
      if (checked) {
        setEditingRolePermissions(prev => [...prev, permissionId]);
      } else {
        setEditingRolePermissions(prev => prev.filter(id => id !== permissionId));
      }
    } else {
      if (checked) {
        setNewRolePermissions(prev => [...prev, permissionId]);
      } else {
        setNewRolePermissions(prev => prev.filter(id => id !== permissionId));
      }
    }
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

    // Se for cargo municipal, verificar se selecionou uma rede
    if (newRoleScope === 'municipal' && !newRoleMunicipalityId) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma rede municipal para o cargo específico",
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
            description: newRoleDescription.trim() || null,
            scope: newRoleScope,
            municipality_id: newRoleScope === 'municipal' ? newRoleMunicipalityId : null,
            permissions: newRolePermissions
          }
        ]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Cargo criado com sucesso"
      });

      // Resetar formulário
      setNewRoleName('');
      setNewRoleDescription('');
      setNewRoleScope('global');
      setNewRoleMunicipalityId('');
      setNewRolePermissions([]);
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
    setEditingRoleScope(role.scope || 'global');
    setEditingRoleMunicipalityId(role.municipality_id || '');
    setEditingRolePermissions(role.permissions || []);
  };

  const cancelEditingRole = () => {
    setEditingRoleId(null);
    setEditingRoleName('');
    setEditingRoleDescription('');
    setEditingRoleScope('global');
    setEditingRoleMunicipalityId('');
    setEditingRolePermissions([]);
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

    // Se for cargo municipal, verificar se selecionou uma rede
    if (editingRoleScope === 'municipal' && !editingRoleMunicipalityId) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma rede municipal para o cargo específico",
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
          description: editingRoleDescription.trim() || null,
          scope: editingRoleScope,
          municipality_id: editingRoleScope === 'municipal' ? editingRoleMunicipalityId : null,
          permissions: editingRolePermissions
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

  const openDeleteConfirmation = (roleId: string, roleName: string) => {
    setRoleToDelete({ id: roleId, name: roleName });
    setDeleteConfirmationOpen(true);
    setDeletePassword('');
  };

  const closeDeleteConfirmation = () => {
    setDeleteConfirmationOpen(false);
    setRoleToDelete(null);
    setDeletePassword('');
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete || !deletePassword) {
      toast({
        title: "Erro",
        description: "Por favor, informe sua senha para confirmar a exclusão",
        variant: "destructive"
      });
      return;
    }

    setIsDeletingRole(true);
    try {
      // Verificar se existem usuários com este cargo
      const { data: usersWithRole, error: countError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', roleToDelete.name)
        .limit(1);

      if (countError) throw countError;

      if (usersWithRole && usersWithRole.length > 0) {
        toast({
          title: "Erro",
          description: `Não é possível excluir este cargo pois existem ${usersWithRole.length} usuário(s) atribuído(s) a ele.`,
          variant: "destructive"
        });
        closeDeleteConfirmation();
        return;
      }

      // Verificar senha do usuário atual antes de excluir
      if (!user?.email) throw new Error("Usuário não autenticado");
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: deletePassword
      });

      if (signInError) {
        throw new Error("Senha incorreta. Não foi possível confirmar a exclusão.");
      }

      const { error } = await supabase
        .from('custom_roles')
        .delete()
        .eq('id', roleToDelete.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Cargo excluído com sucesso"
      });

      closeDeleteConfirmation();
      fetchCustomRoles();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível excluir o cargo",
        variant: "destructive"
      });
    } finally {
      setIsDeletingRole(false);
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
                <NotificationsBell /> {/* Adicionado o sino de notificações aqui */}
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

            {/* Card Gerenciar Usuários para Super Admin */}
            <Card className="mb-6 border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="h-5 w-5" />
                  Gerenciar Usuários
                </CardTitle>
                <CardDescription>
                  Crie e edite contas de usuários em todo o sistema.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/usuarios')}>
                  Acessar Gerenciamento de Usuários
                </Button>
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
                      
                      <div className="space-y-2">
                        <Label>Escopo do Cargo</Label>
                        <RadioGroup 
                          value={newRoleScope} 
                          onValueChange={(value: 'global' | 'municipal') => setNewRoleScope(value)}
                          className="flex flex-col space-y-1"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="global" id="global" />
                            <Label htmlFor="global">Global (visível para todas as redes)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="municipal" id="municipal" />
                            <Label htmlFor="municipal">Específico de Rede Municipal</Label>
                          </div>
                        </RadioGroup>
                      </div>
                      
                      {newRoleScope === 'municipal' && (
                        <div className="space-y-2">
                          <Label htmlFor="roleMunicipality">Rede Municipal *</Label>
                          <Select 
                            value={newRoleMunicipalityId} 
                            onValueChange={setNewRoleMunicipalityId}
                          >
                            <SelectTrigger>
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
                      
                      <div className="space-y-4">
                        <Label>Permissões do Cargo</Label>
                        <div className="border rounded-lg p-3 max-h-60 overflow-y-auto">
                          {Array.from(
                            new Set(availablePermissions.map(p => p.category))
                          ).map(category => (
                            <div key={category} className="mb-3 last:mb-0">
                              <h4 className="font-medium text-sm mb-2">{category}</h4>
                              <div className="space-y-2">
                                {availablePermissions
                                  .filter(p => p.category === category)
                                  .map(permission => (
                                    <div key={permission.id} className="flex items-start space-x-2">
                                      <Checkbox
                                        id={`permission-${permission.id}`}
                                        checked={newRolePermissions.includes(permission.id)}
                                        onCheckedChange={(checked) => 
                                          handlePermissionChange(permission.id, checked as boolean)
                                        }
                                      />
                                      <div className="grid gap-1.5">
                                        <Label 
                                          htmlFor={`permission-${permission.id}`}
                                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                          {permission.name}
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                          {permission.description}
                                        </p>
                                      </div>
                                    </div>
                                  ))
                                }
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <Button 
                        onClick={handleCreateRole} 
                        disabled={isCreatingRole || !newRoleName.trim() || (newRoleScope === 'municipal' && !newRoleMunicipalityId)}
                        className="w-full"
                      >
                        {isCreatingRole ? "Criando..." : "Criar Cargo"}
                      </Button>
                    </div>
                  </div>

                  {/* Listagem de cargos existentes */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-4">Cargos Existentes</h3>
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                      {/* Cargos padrão do sistema */}
                      {systemRoles.map((systemRole) => (
                        <div key={systemRole.id} className="border rounded-lg p-3 bg-muted/50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium">{systemRole.name}</h4>
                              {systemRole.description && (
                                <p className="text-sm text-muted-foreground mt-1">{systemRole.description}</p>
                              )}
                              <div className="flex items-center mt-2">
                                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                  Cargo Padrão
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-1 ml-2">
                              {/* Cargos padrão não podem ser editados ou excluídos */}
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled
                                className="h-8 w-8 opacity-50 cursor-not-allowed"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled
                                className="h-8 w-8 opacity-50 cursor-not-allowed"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Cargos personalizados */}
                      {customRoles.length > 0 && (
                        <div className="pt-4 border-t border-border">
                          <h4 className="font-semibold mb-3 text-sm text-muted-foreground">CARGOS PERSONALIZADOS</h4>
                          {customRoles.map((role) => (
                            <div key={role.id} className="border rounded-lg p-3 mb-3">
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
                                  
                                  <div className="space-y-2">
                                    <Label>Escopo do Cargo</Label>
                                    <RadioGroup 
                                      value={editingRoleScope} 
                                      onValueChange={(value: 'global' | 'municipal') => setEditingRoleScope(value)}
                                      className="flex flex-col space-y-1"
                                    >
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="global" id={`edit-global-${role.id}`} />
                                        <Label htmlFor={`edit-global-${role.id}`}>Global (visível para todas as redes)</Label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="municipal" id={`edit-municipal-${role.id}`} />
                                        <Label htmlFor={`edit-municipal-${role.id}`}>Específico de Rede Municipal</Label>
                                      </div>
                                    </RadioGroup>
                                  </div>
                                  
                                  {editingRoleScope === 'municipal' && (
                                    <div className="space-y-2">
                                      <Label htmlFor={`edit-role-municipality-${role.id}`}>Rede Municipal *</Label>
                                      <Select 
                                        value={editingRoleMunicipalityId} 
                                        onValueChange={setEditingRoleMunicipalityId}
                                      >
                                        <SelectTrigger>
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
                                  
                                  <div className="space-y-4">
                                    <Label>Permissões do Cargo</Label>
                                    <div className="border rounded-lg p-3 max-h-60 overflow-y-auto">
                                      {Array.from(
                                        new Set(availablePermissions.map(p => p.category))
                                      ).map(category => (
                                        <div key={category} className="mb-3 last:mb-0">
                                          <h4 className="font-medium text-sm mb-2">{category}</h4>
                                          <div className="space-y-2">
                                            {availablePermissions
                                              .filter(p => p.category === category)
                                              .map(permission => (
                                                <div key={permission.id} className="flex items-start space-x-2">
                                                  <Checkbox
                                                    id={`edit-permission-${permission.id}-${role.id}`}
                                                    checked={editingRolePermissions.includes(permission.id)}
                                                    onCheckedChange={(checked) => 
                                                      handlePermissionChange(permission.id, checked as boolean)
                                                    }
                                                  />
                                                  <div className="grid gap-1.5">
                                                    <Label 
                                                      htmlFor={`edit-permission-${permission.id}-${role.id}`}
                                                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                    >
                                                      {permission.name}
                                                    </Label>
                                                    <p className="text-xs text-muted-foreground">
                                                      {permission.description}
                                                    </p>
                                                  </div>
                                                </div>
                                              ))
                                            }
                                          </div>
                                        </div>
                                      ))}
                                    </div>
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
                                      disabled={isUpdatingRole || !editingRoleName.trim() || (editingRoleScope === 'municipal' && !editingRoleMunicipalityId)}
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
                                    <div className="flex items-center mt-2">
                                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                        role.scope === 'global' 
                                          ? 'bg-primary/10 text-primary' 
                                          : 'bg-secondary/10 text-secondary'
                                      }`}>
                                        {role.scope === 'global' ? 'Global' : 'Rede Municipal'}
                                      </span>
                                      {role.scope === 'municipal' && role.municipality_name && (
                                        <span className="ml-2 text-xs text-muted-foreground">
                                          ({role.municipality_name})
                                        </span>
                                      )}
                                    </div>
                                    <div className="mt-2">
                                      <p className="text-xs text-muted-foreground">
                                        {role.permissions?.length || 0} permissão(ões) atribuída(s)
                                      </p>
                                    </div>
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
                                      onClick={() => openDeleteConfirmation(role.id, role.name)}
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

                      {customRoles.length === 0 && (
                        <p className="text-muted-foreground text-center py-4">
                          Nenhum cargo personalizado cadastrado ainda.
                        </p>
                      )}
                    </div>
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

      {/* Diálogo de confirmação de exclusão */}
      <Dialog open={deleteConfirmationOpen} onOpenChange={closeDeleteConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão de Cargo</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o cargo "{roleToDelete?.name}"? Esta ação não pode ser desfeita.
              Por favor, informe sua senha para confirmar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deletePassword">Senha</Label>
              <Input
                id="deletePassword"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Digite sua senha"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={closeDeleteConfirmation}
                disabled={isDeletingRole}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteRole}
                disabled={isDeletingRole || !deletePassword}
              >
                {isDeletingRole ? "Excluindo..." : "Excluir Cargo"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}