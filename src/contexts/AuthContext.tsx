import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { signupSchema } from '@/lib/validationSchemas';
import { z } from 'zod';

type UserRole = 'superadmin' | 'adminrede' | 'diretor' | 'secretario' | 'assistente' | null;

interface Profile {
  id: string;
  full_name: string;
  school_id: string | null;
  status: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasPermission: (requiredRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true); // Inicia como true

  const fetchProfileAndRole = async (userId: string) => {
    console.log(`[AuthContext] Buscando perfil e cargo para o usuário: ${userId}`);
    try {
      console.log('[AuthContext] Tentando buscar perfil...');
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('[AuthContext] Erro ao buscar perfil:', profileError);
        setProfile(null); // Garante que o perfil seja nulo em caso de erro
      } else {
        setProfile(profileData);
        console.log('[AuthContext] Perfil carregado:', profileData);
      }

      console.log('[AuthContext] Tentando buscar cargo...');
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .order('role')
        .limit(1)
        .single();

      if (roleError && roleError.code !== 'PGRST116') { // PGRST116 significa que nenhuma linha foi encontrada, o que é aceitável se o usuário ainda não tiver um cargo
        console.error('[AuthContext] Erro ao buscar cargo:', roleError);
        setRole(null); // Garante que o cargo seja nulo em caso de erro
      } else {
        setRole(roleData?.role as UserRole ?? null);
        console.log('[AuthContext] Cargo carregado:', roleData?.role);
      }
    } catch (error) {
      console.error('[AuthContext] Erro inesperado em fetchProfileAndRole:', error);
      setProfile(null);
      setRole(null);
    } finally {
      console.log('[AuthContext] fetchProfileAndRole concluído.');
    }
  };

  useEffect(() => {
    console.log('[AuthContext] useEffect inicial sendo executado...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[AuthContext] Estado de autenticação alterado: ${event}`);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfileAndRole(session.user.id);
        } else {
          setProfile(null);
          setRole(null);
        }
        setLoading(false); // Sempre define loading como false após processar uma mudança de estado de autenticação
        console.log(`[AuthContext] Loading definido como false. Usuário atual: ${session?.user?.id}, cargo: ${role}`);
      }
    );

    // Verifica a sessão inicial para definir o estado de carregamento corretamente
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfileAndRole(session.user.id);
      } else {
        setProfile(null);
        setRole(null);
      }
      setLoading(false);
      console.log(`[AuthContext] Sessão inicial verificada. Loading definido como false. Usuário: ${session?.user?.id}`);
    });


    return () => {
      console.log('[AuthContext] Inscrição de estado de autenticação cancelada.');
      subscription.unsubscribe();
    };
  }, []); // Array de dependências vazio significa que isso é executado uma vez na montagem

  // Configurar listeners em tempo real para mudanças de perfil e cargo
  useEffect(() => {
    if (!user?.id) {
      console.log('[AuthContext] ID de usuário não disponível para listeners em tempo real, ignorando.');
      return;
    }
    console.log(`[AuthContext] Configurando listeners em tempo real para o usuário: ${user.id}`);

    // Ouvir mudanças de perfil
    const profileChannel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[AuthContext] Tempo real: Perfil atualizado:', payload);
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setProfile(payload.new as Profile);
          }
        }
      )
      .subscribe();

    // Ouvir mudanças de cargo
    const roleChannel = supabase
      .channel('role-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[AuthContext] Tempo real: Cargo atualizado:', payload);
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setRole((payload.new as any).role as UserRole);
          } else if (payload.eventType === 'DELETE') {
            setRole(null);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('[AuthContext] Listeners em tempo real cancelados.');
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(roleChannel);
    };
  }, [user?.id]); // Reexecutar quando user.id muda

  const signIn = async (email: string, password: string) => {
    console.log('[AuthContext] Tentando fazer login...');
    setLoading(true); // Define loading como true na tentativa de login
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        console.error('[AuthContext] Erro no login:', error);
        setLoading(false); // Redefine loading em caso de erro
      }
      return { error };
    } catch (error) {
      console.error('[AuthContext] Exceção inesperada no login:', error);
      setLoading(false); // Redefine loading em caso de exceção
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, userRole: UserRole) => {
    console.log('[AuthContext] Tentando cadastrar...');
    setLoading(true); // Define loading como true na tentativa de cadastro
    try {
      // Validar dados de cadastro
      try {
        signupSchema.parse({ email, password, full_name: fullName });
      } catch (error) {
        if (error instanceof z.ZodError) {
          setLoading(false); // Redefine loading em caso de erro de validação
          return { error: new Error(error.errors[0].message) };
        }
      }

      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          }
        }
      });

      if (error) {
        console.error('[AuthContext] Erro no cadastro:', error);
        setLoading(false); // Redefine loading em caso de erro
        return { error };
      }

      // Criar cargo do usuário se o cadastro foi bem-sucedido
      if (data.user && userRole) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert([{ user_id: data.user.id, role: userRole }]);
        
        if (roleError) {
          console.error('[AuthContext] Erro ao inserir cargo:', roleError);
          setLoading(false); // Redefine loading em caso de erro de cargo
          return { error: roleError as unknown as Error };
        }
      }
      // setLoading(false) será tratado por onAuthStateChange após o cadastro bem-sucedido
      return { error: null };
    } catch (error) {
      console.error('[AuthContext] Exceção inesperada no cadastro:', error);
      setLoading(false); // Redefine loading em caso de exceção
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    console.log('[AuthContext] Tentando sair...');
    setLoading(true); // Define loading como true na tentativa de sair
    try {
      await supabase.auth.signOut();
      // setLoading(false) será tratado por onAuthStateChange após a saída bem-sucedida
    } catch (error) {
      console.error('[AuthContext] Erro ao sair:', error);
      setLoading(false); // Redefine loading em caso de erro
    }
  };

  const hasPermission = (requiredRoles: UserRole[]) => {
    if (!role) return false;
    return requiredRoles.includes(role);
  };

  const value = {
    user,
    session,
    profile,
    role,
    loading,
    signIn,
    signUp,
    signOut,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}