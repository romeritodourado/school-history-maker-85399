import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

  // Função para buscar o perfil do usuário
  const fetchProfile = useCallback(async (userId: string) => {
    console.log("AuthContext: Buscando perfil para o usuário:", userId);
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error("AuthContext: Erro ao buscar perfil:", profileError);
      setProfile(null);
      setRole(null);
      return null;
    } else {
      console.log("AuthContext: Perfil carregado:", profileData);
      setProfile(profileData);
      setRole(profileData.role);
      return profileData;
    }
  }, []);

  // Função para atualizar a sessão e o perfil de forma consistente
  const refreshSession = useCallback(async () => {
    setLoading(true); // Inicia o carregamento
    console.log("AuthContext: Atualizando sessão e perfil.");
    try {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("AuthContext: Erro ao obter sessão:", error);
        setUser(null);
        setSession(null);
        setProfile(null);
        setRole(null);
      } else if (currentSession?.user) {
        console.log("AuthContext: Sessão válida encontrada.");
        setUser(currentSession.user);
        setSession(currentSession);
        await fetchProfile(currentSession.user.id); // Garante que o perfil seja carregado
      } else {
        console.log("AuthContext: Nenhuma sessão válida.");
        setUser(null);
        setSession(null);
        setProfile(null);
        setRole(null);
        setActiveMunicipalityIdForSuperAdmin(null); // Limpa o ID da rede municipal ativa
      }
    } catch (error) {
      console.error("AuthContext: Erro no refreshSession:", error);
      setUser(null);
      setSession(null);
      setProfile(null);
      setRole(null);
    } finally {
      console.log("AuthContext: Finalizado refreshSession, definindo loading para false.");
      setLoading(false); // Finaliza o carregamento
    }
  }, [fetchProfile]);

  // SOLUÇÃO 1: Carregamento inicial da sessão (executa apenas uma vez)
  useEffect(() => {
    let ignore = false;
    const initializeAuth = async () => {
      if (!ignore) {
        await refreshSession();
      }
    };
    initializeAuth();
    return () => { ignore = true; };
  }, [refreshSession]); // Depende de refreshSession para garantir que seja chamado na montagem

  // SOLUÇÃO 2: Configurar o listener de sessão (fora do estado, com cleanup)
  useEffect(() => {
    console.log("AuthContext: Configurando listener de auth state change.");
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      console.log(`AuthContext: Auth state changed - Event: ${_event}, User: ${newSession?.user?.id}`);
      // Chama refreshSession para lidar com todas as mudanças de estado de forma consistente
      await refreshSession(); 
    });

    return () => {
      console.log("AuthContext: Desinscrevendo listener de auth state change.");
      subscription.unsubscribe();
    };
  }, [refreshSession]); // Depende de refreshSession

  const signIn = async (email: string, password: string) => {
    console.log(`AuthContext: Tentando login para ${email}`);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error("AuthContext: Erro de login:", error);
        return { error };
      }
      console.log("AuthContext: Login bem-sucedido.");
      return { error: null };
    } catch (error: any) {
      console.error("AuthContext: Exceção durante o login:", error);
      return { error: error instanceof Error ? error : new Error("Erro desconhecido durante o login") };
    }
  };

  const signUp = async (email: string, password: string, name: string, role: AppRole, municipality_id?: string, school_id?: string) => {
    console.log(`AuthContext: Tentando cadastro para ${email}`);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role, municipality_id, school_id },
        },
      });

      if (error) {
        console.error("AuthContext: Erro de cadastro:", error);
        return { error };
      }
      console.log("AuthContext: Cadastro bem-sucedido.");
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
      return { error: null };
    } catch (error: any) {
      console.error("AuthContext: Exceção durante o logout:", error);
      return { error: error instanceof Error ? error : new Error("Erro desconhecido durante o logout") };
    }
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