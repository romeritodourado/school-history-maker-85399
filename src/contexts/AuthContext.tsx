import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
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
  const [loading, setLoading] = useState(true); // Start as true

  const fetchProfileAndRole = async (userId: string) => {
    console.log(`[AuthContext] fetchProfileAndRole INICIADO para o usuário: ${userId}`);
    try {
      // Fetch profile
      console.log('[AuthContext] fetchProfileAndRole: Tentando buscar perfil...');
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('[AuthContext] fetchProfileAndRole: Erro ao buscar perfil:', profileError.message);
        setProfile(null);
      } else if (profileData) {
        setProfile(profileData);
        console.log('[AuthContext] fetchProfileAndRole: Perfil carregado:', profileData);
      } else {
        console.warn('[AuthContext] fetchProfileAndRole: Perfil não encontrado para o usuário:', userId);
        setProfile(null);
      }

      // Fetch role
      console.log('[AuthContext] fetchProfileAndRole: Tentando buscar cargo...');
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .order('role')
        .limit(1)
        .single();

      if (roleError && roleError.code !== 'PGRST116') { // PGRST116 means no rows found, which is acceptable if the user doesn't have a role yet
        console.error('[AuthContext] fetchProfileAndRole: Erro ao buscar cargo:', roleError.message);
        setRole(null);
      } else if (roleData) {
        console.log('[AuthContext] fetchProfileAndRole: Dados de cargo brutos recebidos:', roleData);
        setRole(roleData.role as UserRole ?? null);
        console.log('[AuthContext] fetchProfileAndRole: Cargo carregado e definido:', roleData.role);
      } else {
        console.warn('[AuthContext] fetchProfileAndRole: Cargo não encontrado para o usuário:', userId);
        setRole(null);
      }
    } catch (error) {
      console.error('[AuthContext] fetchProfileAndRole: Erro inesperado no bloco catch:', error);
      setProfile(null);
      setRole(null);
    }
    // No finally here, as the caller (useEffect) will handle overall loading state
  };

  useEffect(() => {
    console.log('[AuthContext] useEffect inicial sendo executado...');
    let isMounted = true; // Flag to prevent state updates on unmounted component

    const handleAuthStateChange = async (event: string, currentSession: Session | null) => {
      console.log(`[AuthContext] onAuthStateChange: Evento: ${event}, Session: ${currentSession ? 'present' : 'null'}`);
      if (!isMounted) return;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        await fetchProfileAndRole(currentSession.user.id);
      } else {
        setProfile(null);
        setRole(null);
      }

      // ⭐ AQUI ESTAVA FALTANDO ⭐
      setLoading(false);
      console.log(`[AuthContext] onAuthStateChange: Loading agora é ${false}. Usuário: ${currentSession?.user?.id}, cargo: ${role}`);
    };

    // Initial session check and setup
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      console.log(`[AuthContext] getSession().then: Session: ${session ? 'present' : 'null'}`);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfileAndRole(session.user.id);
      } else {
        setProfile(null);
        setRole(null);
      }
    }).catch(error => {
      console.error('[AuthContext] getSession().catch: Erro ao buscar sessão inicial:', error);
      if (isMounted) {
        setSession(null);
        setUser(null);
        setProfile(null);
        setRole(null);
      }
    }).finally(() => {
      if (isMounted) {
        console.log(`[AuthContext] getSession().finally: Chamando setLoading(false).`);
        setLoading(false);
        console.log(`[AuthContext] getSession().finally: Loading agora é ${false}. Usuário: ${user?.id}`);
      }
    });

    // Set up real-time auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    return () => {
      isMounted = false; // Cleanup: component is unmounted
      console.log('[AuthContext] Auth state subscription unsubscribed.');
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array to run once on mount

  // Real-time listeners for profile and role changes (separate useEffect for clarity and dependency management)
  useEffect(() => {
    if (!user?.id) {
      console.log('[AuthContext] ID de usuário não disponível para listeners em tempo real de perfil/cargo, ignorando.');
      return;
    }
    console.log(`[AuthContext] Configurando listeners em tempo real para perfil/cargo do usuário: ${user.id}`);

    const profileChannel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => {
          console.log('[AuthContext] Tempo real: Perfil atualizado:', payload);
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setProfile(payload.new as Profile);
          }
        }
      )
      .subscribe();

    const roleChannel = supabase
      .channel('role-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_roles', filter: `user_id=eq.${user.id}` },
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
      console.log('[AuthContext] Listeners em tempo real de perfil/cargo cancelados.');
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(roleChannel);
    };
  }, [user?.id]); // Re-run when user.id changes

  const signIn = async (email: string, password: string) => {
    console.log('[AuthContext] Tentando fazer login...');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        console.error('[AuthContext] Erro no login:', error);
        setLoading(false); // Reset loading on error
      }
      return { error };
    } catch (error) {
      console.error('[AuthContext] Exceção inesperada no login:', error);
      setLoading(false); // Reset loading on unexpected exception
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, userRole: UserRole) => {
    console.log('[AuthContext] Tentando cadastrar...');
    setLoading(true);
    try {
      // Validate signup data
      try {
        signupSchema.parse({ email, password, full_name: fullName });
      } catch (error) {
        if (error instanceof z.ZodError) {
          setLoading(false);
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
        setLoading(false);
        return { error };
      }

      // Create user role if signup was successful
      if (data.user && userRole) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert([{ user_id: data.user.id, role: userRole }]);
        
        if (roleError) {
          console.error('[AuthContext] Erro ao inserir cargo:', roleError);
          setLoading(false);
          return { error: roleError as unknown as Error };
        }
      }
      // The onAuthStateChange listener will handle setting user, session, profile, role, and loading=false
      return { error: null };
    } catch (error) {
      console.error('[AuthContext] Exceção inesperada no cadastro:', error);
      setLoading(false);
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    console.log('[AuthContext] Tentando sair...');
    setLoading(true);
    try {
      await supabase.auth.signOut();
      // The onAuthStateChange listener will handle setting user, session, profile, role, and loading=false
    } catch (error) {
      console.error('[AuthContext] Erro ao sair:', error);
      setLoading(false);
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