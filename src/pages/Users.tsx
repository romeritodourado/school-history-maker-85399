import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, UserCog, Trash2, Mail, Building2, School, Loader2, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { z } from 'zod';
import { signupSchema } from '@/lib/validationSchemas';

type AppRole = 'super_admin' | 'municipal_secretary' | 'network_manager' | 'school_admin' | 'secretary' | 'administrative_assistant';

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  municipality_id: string | null;
  school_id: string | null;
  role: string; // Agora é string para incluir cargos personalizados
  municipality_name?: string;
  school_name?: string;
}

interface Municipality {
  id: string;
  name: string;
}

interface School {
  id: string;
  name: string;
  municipality_id: string;
}

interface CustomRole {
  id: string;
  name: string;
  description: string | null;
  scope: 'global' | 'municipal'; // Adicionado scope para custom roles
}

interface GroupedUsers {
  global: UserProfile[];
  municipalities: {
    id: string;
    name: string;
    users: UserProfile[]; // Users directly associated with municipality (e.g., municipal_secretary)
    schools: {
      id: string;
      name: string;
      users: UserProfile[]; // Users associated with this school
    }[];
  }[];
}

export default function Users() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [filteredSchools, setFilteredSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true); // For initial data fetch
  const [isSubmitting, setIsSubmitting] = useState(false); // For form submission
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'secretary', // Default role
    municipality_id: '',
    school_id: '',
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const { role: currentUserRole, profile: currentUserProfile } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    console.log("useEffect [formData.municipality_id, schools]: formData.municipality_id =", formData.municipality_id);
    if (formData.municipality_id) {
      const newFilteredSchools = schools.filter(s => s.municipality_id === formData.municipality_id);
      setFilteredSchools(newFilteredSchools);
      console.log("useEffect [formData.municipality_id, schools]: Filtered schools =", newFilteredSchools);
    } else {
      setFilteredSchools([]);
      console.log("useEffect [formData.municipality_id, schools]: No municipality selected, filtered schools cleared.");
    }
    // Removed: setFormData(prev => ({ ...prev, school_id: '' })); to avoid unintended resets
  }, [formData.municipality_id, schools]);

  const fetchData = async () => {
    setLoading(true);
    await fetchMunicipalities();
    await fetchSchools();
    await fetchCustomRoles();
    await fetchUsers();
    setLoading(false);
  };

  const fetchMunicipalities = async () => {
    try {
      const { data, error } = await supabase
        .from('municipalities')
        .select('id, name')
        .order('name');
      if (error) throw error;
      setMunicipalities(data || []);
    } catch (error) {
      console.error('Error fetching municipalities:', error);
    }
  };

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, municipality_id')
        .order('name');
      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  };

  const fetchCustomRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_roles')
        .select('*')
        .order('name');
      if (error) throw error;
      setCustomRoles(data || []);
    } catch (error) {
      console.error('Error fetching custom roles:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      let query = supabase
        .from('profiles')
        .select(`
          id, name, email, municipality_id, school_id, role,
          municipalities (name),
          schools (name)
        `)
        .order('name');

      // Super Admin sees all users, other roles see filtered users
      if (currentUserRole !== 'super_admin') {
        if ((currentUserRole === 'municipal_secretary' || currentUserRole === 'network_manager') && currentUserProfile?.municipality_id) {
          query = query.eq('municipality_id', currentUserProfile.municipality_id);
        } else if (currentUserRole === 'school_admin' && currentUserProfile?.school_id) {
          query = query.eq('school_id', currentUserProfile.school_id);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      const usersWithNames = (data || []).map(profile => ({
        ...profile,
        municipality_name: (profile.municipalities as { name: string } | null)?.name,
        school_name: (profile.schools as { name: string } | null)?.name,
      }));

      setUsers(usersWithNames as UserProfile[]);
    } catch (error) {
      toast({
        title: 'Erro ao carregar usuários',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
    }
  };

  const roleRequiresMunicipality = (selectedRole: string) => {
    const roleObj = customRoles.find(cr => cr.name === selectedRole);
    if (roleObj) return roleObj.scope === 'municipal';
    return ['municipal_secretary', 'network_manager', 'school_admin', 'secretary', 'administrative_assistant'].includes(selectedRole);
  };

  const roleRequiresSchool = (selectedRole: string) => {
    return ['school_admin', 'secretary', 'administrative_assistant'].includes(selectedRole);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      signupSchema.parse({
        email: formData.email,
        password: formData.password,
        name: formData.name
      });

      // Client-side validation for municipality_id and school_id
      if (roleRequiresMunicipality(formData.role) && !formData.municipality_id) {
        toast({
          title: 'Erro de validação',
          description: 'O campo "Rede Municipal" é obrigatório para este cargo.',
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      if (roleRequiresSchool(formData.role) && !formData.school_id) {
        toast({
          title: 'Erro de validação',
          description: 'O campo "Escola" é obrigatório para este cargo.',
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Call the Edge Function to create the user
      const { data, error: edgeFunctionError } = await supabase.functions.invoke('manage-user', {
        body: JSON.stringify({
          action: 'create',
          email: formData.email,
          password: formData.password,
          name: formData.name,
          role: formData.role,
          municipality_id: formData.municipality_id || null,
          school_id: formData.school_id || null,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (edgeFunctionError) {
        console.error('Error invoking manage-user edge function:', edgeFunctionError);
        throw new Error(edgeFunctionError.message || 'Erro desconhecido ao invocar função de criação de usuário.');
      }

      // The Edge Function returns a JSON object with 'error' if something went wrong
      if (data && data.error) {
        throw new Error(data.error);
      }

      toast({
        title: 'Usuário criado com sucesso!'
      });
      setDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      toast({
        title: 'Erro ao criar usuário',
        description: error instanceof z.ZodError ? error.errors[0].message : error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    if (!editingUser) return;

    // Client-side validation for municipality_id and school_id
    if (roleRequiresMunicipality(formData.role) && !formData.municipality_id) {
      toast({
        title: 'Erro de validação',
        description: 'O campo "Rede Municipal" é obrigatório para este cargo.',
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }
    if (roleRequiresSchool(formData.role) && !formData.school_id) {
      toast({
        title: 'Erro de validação',
        description: 'O campo "Escola" é obrigatório para este cargo.',
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      // Call the Edge Function to update the user
      const { data, error: edgeFunctionError } = await supabase.functions.invoke('manage-user', {
        body: JSON.stringify({
          action: 'update',
          userId: editingUser.id,
          email: formData.email,
          name: formData.name,
          role: formData.role,
          municipality_id: formData.municipality_id || null,
          school_id: formData.school_id || null,
          // Password is not updated via this form, so it's not sent.
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (edgeFunctionError) {
        console.error('Error invoking manage-user edge function:', edgeFunctionError);
        throw new Error(edgeFunctionError.message || 'Erro desconhecido ao invocar função de atualização de usuário.');
      }

      if (data && data.error) {
        throw new Error(data.error);
      }

      toast({
        title: 'Usuário atualizado com sucesso!'
      });
      setDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      toast({
        title: 'Erro ao atualizar usuário',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação é irreversível.')) return;
    try {
      console.log('Users.tsx: Invoking manage-user edge function for deletion...');
      const { data, error: edgeFunctionError } = await supabase.functions.invoke('manage-user', {
        body: JSON.stringify({
          action: 'delete',
          userId: userId,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (edgeFunctionError) {
        console.error('Users.tsx: Error invoking manage-user edge function:', edgeFunctionError);
        throw new Error(edgeFunctionError.message || 'Erro desconhecido ao invocar função de exclusão de usuário.');
      }

      if (data && data.error) {
        console.error('Users.tsx: Edge function returned error:', data.error);
        throw new Error(data.error);
      }

      toast({
        title: 'Usuário excluído com sucesso!'
      });
      fetchUsers();
    } catch (error) {
      toast({
        title: 'Erro ao excluir usuário',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      super_admin: 'Super Administrador',
      municipal_secretary: 'Secretário(a) Municipal',
      network_manager: 'Gerente de Estatísticas',
      school_admin: 'Diretor Escolar',
      secretary: 'Secretário(a) Escolar',
      administrative_assistant: 'Assistente Administrativo', // Novo cargo
    };
    
    // Verificar se é um cargo personalizado
    const customRole = customRoles.find(r => r.name === role);
    if (customRole) {
      return customRole.name + (customRole.description ? ` (${customRole.description})` : '');
    }
    
    return labels[role] || role;
  };

  const getAllAvailableRoles = () => {
    const systemRoles: string[] = ['super_admin', 'municipal_secretary', 'network_manager', 'school_admin', 'secretary', 'administrative_assistant'];
    const customRoleNames = customRoles.map(r => r.name);
    return [...systemRoles, ...customRoleNames];
  };

  const getAvailableRoles = () => {
    const allRoles = getAllAvailableRoles();
    
    if (currentUserRole === 'super_admin') return allRoles;
    if (currentUserRole === 'municipal_secretary' || currentUserRole === 'network_manager') 
      return allRoles.filter(r => r !== 'super_admin');
    if (currentUserRole === 'school_admin') 
      return allRoles.filter(r => r === 'secretary' || r === 'school_admin' || r === 'administrative_assistant');
    
    return [];
  };

  const resetForm = () => {
    setFormData(prev => ({
      email: '',
      password: '',
      name: '',
      role: 'secretary',
      municipality_id: currentUserProfile?.municipality_id || '', // Set default municipality if current user has one
      school_id: currentUserProfile?.school_id || '', // Set default school if current user has one
    }));
    setEditingUser(null);
  };

  const groupUsers = (allUsers: UserProfile[]): GroupedUsers => {
    const grouped: GroupedUsers = {
      global: [],
      municipalities: [],
    };

    const municipalityMap = new Map<string, { id: string; name: string; users: UserProfile[]; schools: Map<string, { id: string; name: string; users: UserProfile[] }> }>();

    allUsers.forEach(user => {
      // System roles that are global (super_admin) or municipal without a specific school
      const isGlobalSystemRole = user.role === 'super_admin';
      const isMunicipalLevelRole = ['municipal_secretary', 'network_manager'].includes(user.role);
      const isCustomMunicipalRole = customRoles.some(cr => cr.name === user.role && cr.scope === 'municipal');

      if (isGlobalSystemRole) {
        grouped.global.push(user);
      } else if (user.municipality_id && user.municipality_name && (isMunicipalLevelRole || isCustomMunicipalRole)) {
        if (!municipalityMap.has(user.municipality_id)) {
          municipalityMap.set(user.municipality_id, {
            id: user.municipality_id,
            name: user.municipality_name,
            users: [],
            schools: new Map(),
          });
        }
        const muniEntry = municipalityMap.get(user.municipality_id)!;
        muniEntry.users.push(user);
      } else if (user.school_id && user.school_name && user.municipality_id && user.municipality_name) {
        // Users associated with a school
        if (!municipalityMap.has(user.municipality_id)) {
          municipalityMap.set(user.municipality_id, {
            id: user.municipality_id,
            name: user.municipality_name,
            users: [],
            schools: new Map(),
          });
        }
        const muniEntry = municipalityMap.get(user.municipality_id)!;

        if (!muniEntry.schools.has(user.school_id)) {
          muniEntry.schools.set(user.school_id, {
            id: user.school_id,
            name: user.school_name,
            users: [],
          });
        }
        muniEntry.schools.get(user.school_id)!.users.push(user);
      } else {
        // Fallback for users without clear municipality/school or custom global roles
        grouped.global.push(user);
      }
    });

    grouped.municipalities = Array.from(municipalityMap.values()).map(muniEntry => ({
      id: muniEntry.id,
      name: muniEntry.name,
      users: muniEntry.users.sort((a, b) => (a.name || '').localeCompare(b.name || '')),
      schools: Array.from(muniEntry.schools.values()).map(schoolEntry => ({
        id: schoolEntry.id,
        name: schoolEntry.name,
        users: schoolEntry.users.sort((a, b) => (a.name || '').localeCompare(b.name || '')),
      })).sort((a, b) => a.name.localeCompare(b.name)),
    })).sort((a, b) => a.name.localeCompare(b.name)); // Sort municipalities by name

    grouped.global.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return grouped;
  };

  const groupedUsers = groupUsers(users);

  const renderUserCard = (user: UserProfile) => (
    <Card key={user.id} className="flex items-center justify-between p-4">
      <div className="flex-1 space-y-1">
        <p className="font-semibold">{user.name || user.email}</p>
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <Mail className="h-3 w-3" /> {user.email}
        </p>
        <p className="text-sm text-muted-foreground">
          Cargo: {getRoleLabel(user.role)}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="icon" onClick={() => {
          setEditingUser(user);
          const initialFormData = {
            email: user.email || '',
            password: '', // Password is not editable directly
            name: user.name || '',
            role: user.role,
            municipality_id: user.municipality_id || '',
            school_id: user.school_id || '',
          };
          setFormData(initialFormData);
          console.log("handleEdit: Editing user", user);
          console.log("handleEdit: Initial formData", initialFormData);
          setDialogOpen(true);
        }}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)} disabled={user.id === currentUserProfile?.id}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <UserCog className="h-8 w-8" />
              Gerenciar Usuários
            </h1>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingUser ? 'Editar Usuário' : 'Criar Novo Usuário'}</DialogTitle>
                <DialogDescription>
                  {editingUser ? 'Atualize os dados do usuário.' : 'Preencha os dados do novo usuário.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                {!editingUser && (
                  <div>
                    <Label htmlFor="password">Senha *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      minLength={8}
                    />
                    <p className="text-xs text-muted-foreground">
                      A senha deve ter pelo menos 8 caracteres, incluindo letras maiúsculas, minúsculas e números.
                    </p>
                  </div>
                )}
                <div>
                  <Label htmlFor="role">Cargo *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: string) => {
                      setFormData(prev => ({
                        ...prev,
                        role: value,
                        municipality_id: roleRequiresMunicipality(value) && currentUserProfile?.municipality_id ? currentUserProfile.municipality_id : '', // Set default municipality if current user has one and role requires it
                        school_id: roleRequiresSchool(value) && currentUserProfile?.school_id ? currentUserProfile.school_id : '', // Set default school if current user has one and role requires it
                      }));
                    }}
                    disabled={
                      editingUser?.id === currentUserProfile?.id || 
                      !getAvailableRoles().includes(formData.role)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cargo" />
                    </SelectTrigger>
                    <SelectContent>
                        {getAvailableRoles().map((roleOption) => (
                          <SelectItem key={roleOption} value={roleOption}>
                            {getRoleLabel(roleOption)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Conditional rendering for Municipality Select */}
                { roleRequiresMunicipality(formData.role) && (
                  <div>
                    <Label htmlFor="municipality_id">Rede Municipal {roleRequiresMunicipality(formData.role) && '*'}</Label>
                    <Select
                      key={formData.role} // Add key to force re-render when role changes
                      value={formData.municipality_id || ''}
                      onValueChange={(value) => setFormData({ ...formData, municipality_id: value })}
                      disabled={
                        (currentUserRole === 'municipal_secretary' || currentUserRole === 'network_manager') && 
                        currentUserProfile?.municipality_id !== formData.municipality_id
                      }
                      required={roleRequiresMunicipality(formData.role)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={roleRequiresMunicipality(formData.role) ? "Selecione a rede municipal (obrigatório)" : "Selecione a rede municipal"} />
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

                {/* Conditional rendering for School Select */}
                { roleRequiresSchool(formData.role) && (
                  <div>
                    <Label htmlFor="school_id">
                      Escola {roleRequiresSchool(formData.role) && '*'}
                    </Label>
                    <Select
                      key={formData.municipality_id + formData.role} // Add key to force re-render
                      value={formData.school_id || ''} // Ensure value is always a string
                      onValueChange={(value) => setFormData({ ...formData, school_id: value })}
                      disabled={
                        (currentUserRole === 'school_admin' && 
                        currentUserProfile?.school_id !== formData.school_id) ||
                        !formData.municipality_id // Disable if no municipality is selected
                      }
                      required={roleRequiresSchool(formData.role)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={roleRequiresSchool(formData.role) ? "Selecione a escola (obrigatório)" : "Selecione a escola"} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredSchools.length === 0 && formData.municipality_id ? (
                          <SelectItem value="" disabled>Nenhuma escola encontrada para esta rede</SelectItem>
                        ) : (
                          filteredSchools.map((school) => (
                            <SelectItem key={school.id} value={school.id}>
                              {school.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {editingUser ? 'Atualizando...' : 'Criando...'}
                      </>
                    ) : (
                      editingUser ? 'Atualizar' : 'Criar'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        
        {users.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nenhum usuário cadastrado ainda.</p>
              <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Usuário
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8 mt-8">
            {groupedUsers.global.length > 0 && (
              <Card>
                <CardHeader className="bg-muted/50">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <UserCog className="h-5 w-5" />
                    Usuários Globais
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                  {groupedUsers.global.map(renderUserCard)}
                </CardContent>
              </Card>
            )}

            {groupedUsers.municipalities.map(municipality => (
              <Card key={municipality.id}>
                <CardHeader className="bg-primary/10">
                  <CardTitle className="text-xl flex items-center gap-2 text-primary">
                    <Building2 className="h-5 w-5" />
                    Rede Municipal: {municipality.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {municipality.users.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <UserCog className="h-4 w-4 text-muted-foreground" />
                        Usuários da Rede
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {municipality.users.map(renderUserCard)}
                      </div>
                    </div>
                  )}

                  {municipality.schools.map(school => (
                    <Card key={school.id} className="border-l-4 border-accent">
                      <CardHeader className="bg-accent/10">
                        <CardTitle className="text-lg flex items-center gap-2 text-accent-foreground">
                          <School className="h-4 w-4" />
                          Escola: {school.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                        {school.users.map(renderUserCard)}
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}