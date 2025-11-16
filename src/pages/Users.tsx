import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, UserCog, Trash2, Edit, Mail, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { signupSchema } from '@/lib/validationSchemas'; // Importando o schema de validação
import { z } from 'zod';

type UserRole = 'superadmin' | 'adminrede' | 'diretor' | 'secretario' | 'assistente';

interface UserProfile {
  id: string;
  full_name: string;
  school_id: string | null;
  status: string;
  email: string;
  role: UserRole | null;
  school_name?: string;
}

interface School {
  id: string;
  name: string;
}

export default function Users() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); // Estado de carregamento para o formulário
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    email: '',
    password: '',
    full_name: '',
    role: 'assistente' as UserRole,
    school_id: '',
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const { role, profile } = useAuth();

  useEffect(() => {
    fetchSchools();
    fetchUsers();
  }, []);

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          school_id,
          status,
          schools:school_id (name)
        `)
        .order('full_name');

      if (profilesError) throw profilesError;

      const usersWithRoles = await Promise.all(
        (profilesData || []).map(async (profile) => {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id)
            .single();

          const { data: authData } = await supabase.auth.admin.getUserById(profile.id);

          return {
            ...profile,
            email: authData.user?.email || '',
            role: roleData?.role as UserRole ?? null,
            school_name: (profile.schools as any)?.name,
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (error) {
      toast({
        title: 'Erro ao carregar usuários',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user);
    setFormData({
      id: user.id,
      email: user.email,
      password: '', // Senha não pode ser pré-preenchida por segurança
      full_name: user.full_name,
      role: user.role || 'assistente',
      school_id: user.school_id || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingUser(null);
    setFormData({
      id: '',
      email: '',
      password: '',
      full_name: '',
      role: 'assistente',
      school_id: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("handleSubmit chamado, definindo isSubmitting para true.");
    setIsSubmitting(true);

    try {
      // Validação dos campos principais
      let validationError: z.ZodError | null = null;
      try {
        const schemaToValidate = editingUser
          ? signupSchema.pick({ email: true, full_name: true }).partial() // Permite atualização parcial para usuário existente
          : signupSchema.pick({ email: true, password: true, full_name: true });

        schemaToValidate.parse({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
        });

        // Validação adicional para senha se estiver editando e uma nova senha for fornecida
        if (editingUser && formData.password) {
          signupSchema.pick({ password: true }).parse({ password: formData.password });
        } else if (!editingUser && !formData.password) {
          // Para novos usuários, a senha é obrigatória
          throw new z.ZodError([{ path: ['password'], message: 'Senha é obrigatória para novos usuários' }]);
        }

      } catch (error) {
        if (error instanceof z.ZodError) {
          validationError = error;
        } else {
          throw error; // Re-lança outros erros
        }
      }

      if (validationError) {
        toast({
          title: "Erro de validação",
          description: validationError.errors[0].message,
          variant: "destructive",
        });
        console.log("Erro de validação, retornando. isSubmitting deve ser resetado pelo finally.");
        return; // Sai cedo se a validação falhar
      }

      if (editingUser) {
        // --- ATUALIZAR USUÁRIO EXISTENTE ---
        // 1. Atualizar email em auth.users (se alterado)
        if (formData.email !== editingUser.email) {
          const { error: authUpdateError } = await supabase.auth.admin.updateUserById(editingUser.id, {
            email: formData.email,
          });
          if (authUpdateError) throw authUpdateError;
        }

        // 2. Atualizar tabela profiles
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            school_id: formData.school_id || null,
          })
          .eq('id', editingUser.id);
        if (profileUpdateError) throw profileUpdateError;

        // 3. Atualizar tabela user_roles
        const { error: roleUpdateError } = await supabase
          .from('user_roles')
          .update({ role: formData.role })
          .eq('user_id', editingUser.id);
        if (roleUpdateError) throw roleUpdateError;

        // 4. Atualizar senha se fornecida
        if (formData.password) {
          const { error: passwordUpdateError } = await supabase.auth.admin.updateUserById(editingUser.id, {
            password: formData.password,
          });
          if (passwordUpdateError) throw passwordUpdateError;
        }

        toast({ title: 'Usuário atualizado com sucesso!' });

      } else {
        // --- CRIAR NOVO USUÁRIO ---
        const redirectUrl = `${window.location.origin}/`;
        
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              full_name: formData.full_name,
            }
          }
        });

        if (authError) throw authError;

        if (authData.user) {
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert([{ user_id: authData.user.id, role: formData.role }]);

          if (roleError) throw roleError;

          // O trigger handle_new_user já cria o perfil com full_name.
          // Precisamos apenas atualizar o school_id se ele foi fornecido.
          if (formData.school_id) {
            const { error: profileUpdateError } = await supabase
              .from('profiles')
              .update({ school_id: formData.school_id })
              .eq('id', authData.user.id);

            if (profileUpdateError) throw profileUpdateError;
          }
        }
        toast({ title: 'Usuário criado com sucesso!' });
      }

      setDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      toast({
        title: 'Erro ao salvar usuário',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      console.error("Erro no handleSubmit:", error);
    } finally {
      console.log("Bloco finally executado: definindo isSubmitting para false.");
      setIsSubmitting(false); // Sempre reseta o estado de carregamento
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;

    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) throw error;
      toast({ title: 'Usuário excluído com sucesso!' });
      fetchUsers();
    } catch (error) {
      toast({
        title: 'Erro ao excluir usuário',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  const getRoleLabel = (role: UserRole | null) => {
    const labels: Record<UserRole, string> = {
      superadmin: 'Super Administrador',
      adminrede: 'Admin da Rede',
      diretor: 'Diretor',
      secretario: 'Secretário',
      assistente: 'Assistente',
    };
    return labels[role || 'assistente'] || 'Sem cargo';
  };

  const canEditUser = (targetUser: UserProfile) => {
    // Superadmin pode editar qualquer um, exceto a si mesmo
    if (role === 'superadmin') return targetUser.id !== profile?.id;
    
    // Admin da Rede pode editar qualquer um, exceto superadmin e a si mesmo
    if (role === 'adminrede' && targetUser.role !== 'superadmin') return targetUser.id !== profile?.id;
    
    // Diretor pode editar secretários e assistentes da sua própria escola, exceto a si mesmo
    if (role === 'diretor' && ['secretario', 'assistente'].includes(targetUser.role || '') && targetUser.school_id === profile?.school_id) return targetUser.id !== profile?.id;
    
    return false;
  };

  const getAvailableRolesForCreation = (): UserRole[] => {
    if (role === 'superadmin') {
      return ['superadmin', 'adminrede', 'diretor', 'secretario', 'assistente'];
    }
    if (role === 'adminrede') {
      return ['adminrede', 'diretor', 'secretario', 'assistente'];
    }
    if (role === 'diretor') {
      return ['secretario', 'assistente'];
    }
    return ['assistente']; // Default or fallback
  };

  const getAvailableRolesForEdit = (targetUserRole: UserRole | null): UserRole[] => {
    let availableRoles = getAvailableRolesForCreation();
    
    // Se estiver editando, garante que o cargo atual do usuário seja uma opção,
    // mesmo que o usuário logado não tenha permissão para *criar* esse cargo.
    if (targetUserRole && !availableRoles.includes(targetUserRole)) {
      availableRoles = [...availableRoles, targetUserRole];
    }
    
    // Remove duplicatas e ordena para consistência
    return Array.from(new Set(availableRoles)).sort();
  };

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
            if (!open) {
              resetForm();
              setIsSubmitting(false); // Reset explícito do isSubmitting ao fechar o diálogo
              console.log("Diálogo fechado, isSubmitting resetado para false.");
            } else {
              console.log("Diálogo aberto, estado de isSubmitting:", isSubmitting);
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                resetForm();
                console.log("Botão 'Novo Usuário' clicado, resetando formulário.");
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent key={editingUser ? editingUser.id : 'new-user-dialog'}>
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? 'Editar Usuário' : 'Criar Novo Usuário'}
                </DialogTitle>
                <DialogDescription>
                  {editingUser ? 'Edite os dados do usuário' : 'Preencha os dados do novo usuário'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Nome Completo</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="password">Senha {editingUser ? '(deixe em branco para não alterar)' : '*'}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingUser}
                    minLength={6}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="role">Cargo</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
                    disabled={isSubmitting || editingUser?.id === profile?.id}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableRolesForEdit(editingUser?.role).map((r) => {
                        console.log("Rendering SelectItem for role:", r); // Log para depuração
                        return (
                          <SelectItem key={r} value={r}>
                            {getRoleLabel(r)}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="school_id">Escola</Label>
                  <Select
                    value={formData.school_id}
                    onValueChange={(value) => setFormData({ ...formData, school_id: value })}
                    disabled={isSubmitting || (role === 'diretor' && editingUser?.school_id !== profile?.school_id)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma escola (opcional)" />
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
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
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
                  <span className="truncate">{user.full_name}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(user)}
                      disabled={!canEditUser(user)}
                      title={!canEditUser(user) ? "Você não tem permissão para editar este usuário" : "Editar usuário"}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(user.id)}
                      disabled={user.id === profile?.id || !canEditUser(user)}
                      title={user.id === profile?.id ? "Você não pode excluir seu próprio perfil" : (!canEditUser(user) ? "Você não tem permissão para excluir este usuário" : "Excluir usuário")}
                    >
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
                  {user.school_name && (
                    <p className="text-muted-foreground">
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