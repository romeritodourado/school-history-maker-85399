import React, { createContext, useContext, useState, useEffect } from 'react';
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
  fetchProfile: (userId: string) => Promise<void>;
  activeMunicipalityIdForSuperAdmin: string | null;
  setActiveMunicipalityIdForSuperAdmin: (id: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true); // Start as true
  const [activeMunicipalityIdForSuperAdmin, setActiveMunicipalityIdForSuperAdmin] = useState<string | null>(null);

  const fetchUserProfileAndRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') { // No rows found
        setProfile(null);
        setRole(null);
      } else if (error) {
        console.error("AuthContext: Erro ao buscar perfil:", error);
        setProfile(null);
        setRole(null);
      } else if (data) {
        setProfile(data);
        setRole(data.role);
      } else {
        setProfile(null);
        setRole(null);
      }
    } catch (error) {
      console.error("AuthContext: Erro capturado em fetchUserProfileAndRole:", error);
      setProfile(null);
      setRole(null);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true); // Garante que o loading é true no início da inicialização
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (initialSession?.user) {
          setUser(initialSession.user);
          setSession(initialSession);
          await fetchUserProfileAndRole(initialSession.user.id);
        } else {
          setUser(null);
          setSession(null);
          setProfile(null);
          setRole(null);
          setActiveMunicipalityIdForSuperAdmin(null);
        }
      } catch (error) {
        console.error("AuthContext: Erro durante a busca inicial da sessão de autenticação:", error);
        setUser(null);
        setSession(null);
        setProfile(null);
        setRole(null);
        setActiveMunicipalityIdForSuperAdmin(null);
      } finally {
        setLoading(false); // Define loading como false APÓS a conclusão da inicialização
      }
    };

    initializeAuth();

    // Listener para mudanças de estado de autenticação subsequentes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Apenas reage a mudanças significativas que não sejam a inicialização
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (session?.user && user?.id !== session.user.id) { // Atualiza apenas se o usuário realmente mudou
            setUser(session.user);
            setSession(session);
            await fetchUserProfileAndRole(session.user.id);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
          setProfile(null);
          setRole(null);
          setActiveMunicipalityIdForSuperAdmin(null);
        }
        // Outros eventos como PASSWORD_RECOVERY não exigem alteração do estado de user/profile
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Array de dependências vazio para rodar uma vez na montagem

  const signIn = async (email: string, password: string) => {
    setLoading(true); // Define loading como true para o processo de login
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setLoading(false); // Reseta loading em caso de erro
        return { error };
      }
      // onAuthStateChange vai lidar com a definição de user, session, profile, role e loading para false
      return { error: null };
    } catch (error: any) {
      console.error("AuthContext: Erro durante signIn:", error);
      setLoading(false);
      return { error: error instanceof Error ? error : new Error("Erro desconhecido durante o login.") };
    }
  };

  const signUp = async (email: string, password: string, name: string, role: AppRole, municipality_id?: string, school_id?: string) => {
    setLoading(true); // Define loading como true para o processo de cadastro
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role, municipality_id, school_id },
        },
      });

      if (error) {
        setLoading(false); // Reseta loading em caso de erro
        return { error };
      }
      // onAuthStateChange vai lidar com a definição de user, session, profile, role e loading para false
      return { error: null };
    } catch (error: any) {
      console.error("AuthContext: Erro durante signUp:", error);
      setLoading(false);
      return { error: error instanceof Error ? error : new Error("Erro desconhecido durante o cadastro.") };
    }
  };

  const signOut = async () => {
    setLoading(true); // Define loading como true para o processo de logout
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("AuthContext: Erro durante signOut:", error);
        setLoading(false); // Reseta loading em caso de erro
      }
      // onAuthStateChange vai lidar com o reset de user, session, profile, role e loading para false
      return { error };
    } catch (error: any) {
      console.error("AuthContext: Erro durante signOut:", error);
      setLoading(false);
      return { error: error instanceof Error ? error : new Error("Erro desconhecido durante o logout.") };
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
    fetchProfile: fetchUserProfileAndRole,
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