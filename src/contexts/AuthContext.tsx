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

  // Efeito para lidar com a sessão inicial e mudanças no estado de autenticação
  useEffect(() => {
    let isMounted = true;

    const handleAuthStateChange = async (event: string, newSession: Session | null) => {
      if (!isMounted) return;

      console.log(`AuthContext: Auth state changed - Event: ${event}, User: ${newSession?.user?.id}`);
      
      // Define loading como true apenas para eventos significativos que requerem um loader de página inteira
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        setLoading(true); 
      }

      if (newSession?.user) {
        setUser(newSession.user);
        setSession(newSession);
        await fetchProfileForUser(newSession.user.id);
      } else {
        // Limpa todos os dados do usuário em caso de logout ou nenhuma sessão
        setUser(null);
        setSession(null);
        setProfile(null);
        setRole(null);
        setActiveMunicipalityIdForSuperAdmin(null);
      }
      setLoading(false); // Sempre define loading como false após processar a mudança de estado
    };

    // Obtém a sessão inicial e configura o listener
    supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      if (!isMounted) return;
      if (error) {
        console.error("AuthContext: Erro ao obter sessão inicial:", error);
        handleAuthStateChange('INITIAL_SESSION_ERROR', null);
      } else {
        handleAuthStateChange('INITIAL_SESSION', initialSession);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    return () => {
      isMounted = false;
      console.log("AuthContext: Desinscrevendo listener de auth state change.");
      subscription.unsubscribe();
    };
  }, [fetchProfileForUser]); // A dependência fetchProfileForUser está correta

  const signIn = async (email: string, password: string) => {
    console.log(`AuthContext: Tentando login para ${email}`);
    setLoading(true); // Define loading como true antes da chamada da API
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error("AuthContext: Erro de login:", error);
        setLoading(false); // Define loading como false em caso de erro
        return { error };
      }
      
      console.log("AuthContext: Login bem-sucedido. O listener onAuthStateChange irá atualizar o estado.");
      // O listener onAuthStateChange irá lidar com a definição de user, session, profile, role e o setLoading(false) final
      return { error: null };
    } catch (error: any) {
      console.error("AuthContext: Exceção durante o login:", error);
      setLoading(false); // Define loading como false em caso de exceção
      return { error: error instanceof Error ? error : new Error("Erro desconhecido durante o login") };
    }
  };

  const signUp = async (email: string, password: string, name: string, role: AppRole, municipality_id?: string, school_id?: string) => {
    console.log(`AuthContext: Tentando cadastro para ${email}`);
    setLoading(true); // Define loading como true antes da chamada da API
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
        setLoading(false); // Define loading como false em caso de erro
        return { error };
      }
      
      console.log("AuthContext: Cadastro bem-sucedido. O listener onAuthStateChange irá atualizar o estado.");
      // O listener onAuthStateChange irá lidar com a definição de user, session, profile, role e o setLoading(false) final
      return { error: null };
    } catch (error: any) {
      console.error("AuthContext: Exceção durante o cadastro:", error);
      setLoading(false); // Define loading como false em caso de exceção
      return { error: error instanceof Error ? error : new Error("Erro desconhecido durante o cadastro") };
    }
  };

  const signOut = async () => {
    console.log("AuthContext: Tentando logout.");
    setLoading(true); // Define loading como true antes da chamada da API
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("AuthContext: Erro de logout:", error);
        setLoading(false); // Define loading como false em caso de erro
        return { error };
      }
      
      console.log("AuthContext: Logout bem-sucedido. O listener onAuthStateChange irá atualizar o estado.");
      // O listener onAuthStateChange irá lidar com a limpeza do estado e o setLoading(false) final
      return { error: null };
    } catch (error: any) {
      console.error("AuthContext: Exceção durante o logout:", error);
      setLoading(false); // Define loading como false em caso de exceção
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