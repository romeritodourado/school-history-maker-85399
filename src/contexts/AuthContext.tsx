// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { Database } from '@/integrations/supabase/types';

// Define types for profile and role
type Profile = Database['public']['Tables']['profiles']['Row'];
type AppRole = Profile['role'];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string, role: AppRole, municipality_id?: string, school_id?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  activeMunicipalityIdForSuperAdmin: string | null;
  setActiveMunicipalityIdForSuperAdmin: (id: string | null) => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMunicipalityIdForSuperAdmin, setActiveMunicipalityIdForSuperAdmin] = useState<string | null>(null);

  // refs para controle de concorrência e montagem
  const isMountedRef = useRef(true);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Função para buscar o perfil do usuário (resiliente)
  const fetchProfile = useCallback(async (userId: string) => {
    console.log("AuthContext: Buscando perfil para o usuário:", userId);
    try {
      // Tenta buscar o perfil completo primeiro
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        // Log detalhado para debug
        console.warn("AuthContext: Erro ao buscar perfil (single *). Tentando buscar apenas role. Erro:", profileError);
        // Tenta buscar apenas role (fallback)
        const { data: roleData, error: roleError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();

        if (roleError || !roleData) {
          console.error("AuthContext: Falha ao buscar role do perfil:", roleError);
          // Não lançar — apenas retorna null para não travar o app
          if (isMountedRef.current) {
            setProfile(null);
            setRole(null);
          }
          return null;
        } else {
          if (isMountedRef.current) {
            setProfile(roleData as unknown as Profile); // perfil parcial
            setRole((roleData as any).role ?? null);
          }
          console.log("AuthContext: Perfil (fallback role) carregado:", roleData);
          return roleData as unknown as Profile;
        }
      } else {
        if (isMountedRef.current) {
          setProfile(profileData as Profile);
          setRole((profileData as any).role ?? null);
        }
        console.log("AuthContext: Perfil carregado:", profileData);
        return profileData as Profile;
      }
    } catch (err) {
      console.error("AuthContext: Exceção ao buscar perfil:", err);
      if (isMountedRef.current) {
        setProfile(null);
        setRole(null);
      }
      return null;
    }
  }, []);

  // Função para atualizar a sessão e o perfil de forma consistente
  const refreshSession = useCallback(async () => {
    // Evita chamadas concorrentes
    if (isRefreshingRef.current) {
      console.log("AuthContext: refreshSession já em andamento — ignorando chamada concorrente.");
      return;
    }
    isRefreshingRef.current = true;
    if (isMountedRef.current) setLoading(true);

    console.log("AuthContext: Atualizando sessão e perfil.");
    try {
      const res = await supabase.auth.getSession();
      // compatibilidade com diferentes versões do client
      const currentSession = (res as any)?.data?.session ?? (res as any)?.session ?? null;
      const error = (res as any)?.error ?? null;

      if (error) {
        console.error("AuthContext: Erro ao obter sessão:", error);
        if (isMountedRef.current) {
          setUser(null);
          setSession(null);
          setProfile(null);
          setRole(null);
        }
      } else if (currentSession?.user) {
        console.log("AuthContext: Sessão válida encontrada. User id:", currentSession.user.id);
        if (isMountedRef.current) {
          setUser(currentSession.user);
          setSession(currentSession);
        }
        // Buscar o perfil (não bloqueia o carregamento se falhar)
        await fetchProfile(currentSession.user.id);
      } else {
        console.log("AuthContext: Nenhuma sessão válida.");
        if (isMountedRef.current) {
          setUser(null);
          setSession(null);
          setProfile(null);
          setRole(null);
          setActiveMunicipalityIdForSuperAdmin(null);
        }
      }
    } catch (error) {
      console.error("AuthContext: Erro no refreshSession:", error);
      if (isMountedRef.current) {
        setUser(null);
        setSession(null);
        setProfile(null);
        setRole(null);
      }
    } finally {
      // Garantir que loading seja desativado — evita spinner infinito
      if (isMountedRef.current) {
        setLoading(false);
      }
      isRefreshingRef.current = false;
      console.log("AuthContext: Finalizado refreshSession. loading=false");
    }
  }, [fetchProfile]);

  // Carregamento inicial (executa apenas uma vez na montagem)
  useEffect(() => {
    let cancelled = false;
    const initializeAuth = async () => {
      if (cancelled) return;
      await refreshSession();
    };
    initializeAuth();
    return () => { cancelled = true; };
  }, [refreshSession]);

  // Listener de mudanças na autenticação — desencadeia refreshSession,
  // mas não aguarda por ele para evitar conflitos/loops.
  useEffect(() => {
    console.log("AuthContext: Configurando listener de auth state change.");
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, _session) => {
      console.log(`AuthContext: Evento auth state change recebido: ${_event} - user: ${_session?.user?.id ?? 'null'}`);
      // Não await aqui — chama o refresh, mas sem criar concorrência
      // refreshSession já previne execuções concorrentes via isRefreshingRef
      void refreshSession();
    });

    return () => {
      console.log("AuthContext: Desinscrevendo listener de auth state change.");
      subscription.unsubscribe();
    };
  }, [refreshSession]);

  const signIn = async (email: string, password: string) => {
    console.log(`AuthContext: Tentando login para ${email}`);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error("AuthContext: Erro de login:", error);
        return { error };
      }
      console.log("AuthContext: Login bem-sucedido.");
      // refreshSession será chamado pelo listener onAuthStateChange, mas
      // garantimos também chamar aqui de forma não-bloqueante para acelerar o fluxo
      void refreshSession();
      return { error: null };
    } catch (error: any) {
      console.error("AuthContext: Exceção durante o login:", error);
      return { error: error instanceof Error ? error : new Error("Erro desconhecido durante o login") };
    }
  };

  const signUp = async (email: string, password: string, name: string, roleParam: AppRole, municipality_id?: string, school_id?: string) => {
    console.log(`AuthContext: Tentando cadastro para ${email}`);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role: roleParam, municipality_id, school_id },
        },
      });

      if (error) {
        console.error("AuthContext: Erro de cadastro:", error);
        return { error };
      }
      console.log("AuthContext: Cadastro bem-sucedido.");
      // refreshSession será chamado automaticamente pelo listener
      return { error: null };
    } catch (error: any) {
      console.error("AuthContext: Exceção durante o cadastro:", error);
      return { error: error instanceof Error ? error : new Error("Erro desconhecido durante o cadastro") };
    }
  };

  const signOut = async () => {
    console.log("AuthContext: Tentando logout.");
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("AuthContext: Erro de logout:", error);
        return { error };
      }
      console.log("AuthContext: Logout bem-sucedido.");
      // refreshSession será chamado pelo listener
      return { error: null };
    } catch (error: any) {
      console.error("AuthContext: Exceção durante o logout:", error);
      return { error: error instanceof Error ? error : new Error("Erro desconhecido durante o logout") };
    }
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    role,
    loading,
    signIn,
    signUp,
    signOut,
    activeMunicipalityIdForSuperAdmin,
    setActiveMunicipalityIdForSuperAdmin,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
