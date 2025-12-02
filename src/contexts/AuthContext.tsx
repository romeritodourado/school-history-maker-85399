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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true); // O estado inicial é true para carregar a sessão
  const [activeMunicipalityIdForSuperAdmin, setActiveMunicipalityIdForSuperAdmin] = useState<string | null>(null);

  // Função para buscar o perfil do usuário
  const fetchProfileForUser = useCallback(async (userId: string) => {
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

  // Função centralizada para atualizar a sessão e o perfil
  const refreshSession = useCallback(async (sessionFromEvent?: Session | null) => {
    try {
      const currentSession = sessionFromEvent ?? (await supabase.auth.getSession()).data.session;

      if (!currentSession) {
        setUser(null);
        setSession(null);
        setProfile(null);
        setRole(null);
        setActiveMunicipalityIdForSuperAdmin(null);
        return;
      }

      setUser(currentSession.user);
      setSession(currentSession);
      await fetchProfileForUser(currentSession.user.id);
    } catch (err) {
      console.error("AuthContext: Erro em refreshSession:", err);
      setUser(null);
      setSession(null);
      setProfile(null);
      setRole(null);
      setActiveMunicipalityIdForSuperAdmin(null);
    }
  }, [fetchProfileForUser]);

  // Efeito para lidar com a sessão inicial e configurar o listener de onAuthStateChange
  useEffect(() => {
    let subscribed = true;

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!subscribed) return;
        console.log("Auth state changed - Event:", event);

        // 🔥 EVITA DUPLICATE SIGNED_IN
        // Se já existe um usuário autenticado e o evento é SIGNED_IN, ignoramos para evitar re-renderizações desnecessárias
        // e o `loading` ser ativado novamente.
        if (event === "SIGNED_IN" && user) {
          console.log("AuthContext: Ignorando SIGNED_IN duplicado.");
          return;
        }

        // Apenas mostramos o loading para eventos que realmente mudam o estado de autenticação
        // e não para refreshes passivos de token.
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
          setLoading(true);
        }
        
        await refreshSession(session);
        
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
          setLoading(false);
        }
      }
    );

    // Realiza a verificação inicial da sessão uma vez
    refreshSession().finally(() => {
      if (subscribed) {
        setLoading(false);
      }
    });

    return () => {
      subscribed = false;
      authListener.subscription.unsubscribe();
      console.log("AuthContext: Desinscrevendo listener de auth state change.");
    };
  }, [refreshSession, user]); // Adicionado `user` como dependência para a verificação de SIGNED_IN duplicado

  const signIn = async (email: string, password: string) => {
    console.log(`AuthContext: Tentando login para ${email}`);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error("AuthContext: Erro de login:", error);
        return { error };
      }
      
      console.log("AuthContext: Login bem-sucedido. O listener onAuthStateChange irá atualizar o estado.");
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
          data: {
            name,
            role,
            municipality_id,
            school_id
          }
        }
      });
      
      if (error) {
        console.error("AuthContext: Erro de cadastro:", error);
        return { error };
      }
      
      console.log("AuthContext: Cadastro bem-sucedido. O listener onAuthStateChange irá atualizar o estado.");
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
      
      console.log("AuthContext: Logout bem-sucedido. O listener onAuthStateChange irá atualizar o estado.");
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