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

type AppRole = 'super_admin' | 'municipal_secretary' | 'network_manager' | 'school_admin' | 'secretary';

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
    if (formData.municipality_id) {
      setFilteredSchools(schools.filter(s => s.municipality_id === formData.municipality_id));
    } else {
      setFilteredSchools([]);
    }
    setFormData(prev => ({ ...prev, school_id: '' })); // Reset school when municipality changes
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

      if ((currentUserRole === 'municipal_secretary' || currentUserRole === 'network_manager') && currentUserProfile?.municipality_id) {
        query = query.eq('municipality_id', currentUserProfile.municipality_id);
      } else if (currentUserRole === 'school_admin' && currentUserProfile?.school_id) {
        query = query.eq('school_id', currentUserProfile.school_id);
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      signupSchema.parse({
        email: formData.email,
        password: formData.password,
        name: formData.name
      });

      // Call the Edge Function to create the user
      const { data, error: edgeFunctionError } = await supabase.functions.invoke('create-user', {
        body: JSON.stringify({
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
        console.error('Error invoking create-user edge function:', edgeFunctionError);
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

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          email: formData.email,
          role: formData.role,
          municipality_id: formData.municipality_id || null,
          school_id: formData.school_id || null,
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      // Update auth.users email if changed
      if (editingUser.email !== formData.email) {
        const { error: authUpdateError } = await supabase.auth.admin.updateUserById(editingUser.id, {
          email: formData.email
        });
        if (authUpdateError) throw authUpdateError;
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
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;
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
      secretary: 'Assistente Administrativo',
    };
    
    // Verificar se é um cargo personalizado
    const customRole = customRoles.find(r => r.name === role);
    if (customRole) {
      return customRole.name + (customRole.description ? ` (${customRole.description})` : '');
    }
    
    return labels[role] || role;
  };

  const getAllAvailableRoles = () => {
    const systemRoles: string[] = ['super_admin', 'municipal_secretary', 'network_manager', 'school_admin', 'secretary'];
    const customRoleNames = customRoles.map(r => r.name);
    return [...systemRoles, ...customRoleNames];
  };

  const getAvailableRoles = () => {
    const allRoles = getAllAvailableRoles();
    
    if (currentUserRole === 'super_admin') return allRoles;
    if (currentUserRole === 'municipal_secretary' || currentUserRole === 'network_manager') 
      return allRoles.filter(r => r !== 'super_admin');
    if (currentUserRole === 'school_admin') 
      return allRoles.filter(r => r === 'secretary' || r === 'school_admin');
    
    return [];
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      name: '',
      role: 'secretary',
      municipality_id: '',
      school_id: '',
    });
    setEditingUser(null);
  };

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
                    onValueChange={(value: string) => setFormData({ ...formData, role: value })}
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
                {(formData.role === 'municipal_secretary' || formData.role === 'network_manager' || formData.role === 'school_admin' || formData.role === 'secretary' || 
                  ['municipal_secretary', 'network_manager', 'school_admin', 'secretary'].includes(formData.role)) && (
                  <div>
                    <Label htmlFor="municipality_id">Rede Municipal</Label>
                    <Select
                      value={formData.municipality_id}
                      onValueChange={(value) => setFormData({ ...formData, municipality_id: value })}
                      disabled={
                        (currentUserRole === 'municipal_secretary' || currentUserRole === 'network_manager') && 
                        currentUserProfile?.municipality_id !== formData.municipality_id
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a rede municipal (opcional)" />
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
                {(formData.role === 'school_admin' || formData.role === 'secretary' || 
                  ['school_admin', 'secretary'].includes(formData.role)) && (
                  <div>
                    <Label htmlFor="school_id">Escola</Label>
                    <Select
                      value={formData.school_id}
                      onValueChange={(value) => setFormData({ ...formData, school_id: value })}
                      disabled={
                        currentUserRole === 'school_admin' && 
                        currentUserProfile?.school_id !== formData.school_id
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a escola (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredSchools.map((school) => (
                          <SelectItem key={school.id} value={school.id}>
                            {school.name}
                          </SelectItem>
                        ))}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {users.map((user) => (
            <Card key={user.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate">{user.name || user.email}</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => {
                      setEditingUser(user);
                      setFormData({
                        email: user.email || '',
                        password: '', // Password is not editable directly
                        name: user.name || '',
                        role: user.role,
                        municipality_id: user.municipality_id || '',
                        school_id: user.school_id || '',
                      });
                      setDialogOpen(true);
                    }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)} disabled={user.id === currentUserProfile?.id}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {user.email}
                  </p>
                  <p className="text-muted-foreground">
                    Cargo: {getRoleLabel(user.role)}
                  </p>
                  {user.municipality_name && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      Rede: {user.municipality_name}
                    </p>
                  )}
                  {user.school_name && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <School className="h-4 w-4" />
                      Escola: {user.school_name}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}