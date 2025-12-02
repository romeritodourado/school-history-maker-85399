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
  loading: boolean; // 'loading' agora é para operações ativas (login, logout, etc.)
  initialSessionChecked: boolean; // Renomeado de 'initializing'
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
  const [loading, setLoading] = useState(false); // 'loading' agora é para operações ativas (login, logout, etc.)
  const [initialSessionChecked, setInitialSessionChecked] = useState(false); // Novo estado para a carga inicial da sessão
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

  // Efeito para lidar com a sessão inicial (apenas uma vez na montagem)
  useEffect(() => {
    const getInitialSession = async () => {
      console.log("AuthContext: Recuperando sessão inicial...");
      setLoading(true); // Ativa loading para a operação de login
      
      const { data, error: sessionError } = await supabase.auth.getSession();
      const sessionData = data.session;

      if (sessionError) {
        console.error("AuthContext: Erro ao obter sessão inicial:", sessionError);
      }

      console.log("AuthContext: Resultado de getSession() -> sessionData:", sessionData);

      if (sessionData?.user) {
        console.log("AuthContext: Usuário encontrado na sessão inicial. Carregando perfil...");
        setUser(sessionData.user);
        setSession(sessionData);
        const fetchedProfile = await fetchProfileForUser(sessionData.user.id);
        console.log("AuthContext: Perfil carregado na sessão inicial:", fetchedProfile);
      } else {
        console.log("AuthContext: Nenhum usuário encontrado na sessão inicial.");
        setUser(null);
        setSession(null);
        setProfile(null);
        setRole(null);
        setActiveMunicipalityIdForSuperAdmin(null);
      }

      setInitialSessionChecked(true); // Libera o ProtectedRoute após a checagem inicial
      setLoading(false); // Desativa loading após a operação
      console.log("AuthContext: Sessão inicial recuperada. initialSessionChecked: true. Loading: false.");
    };

    getInitialSession();
  }, [fetchProfileForUser]);

  // Efeito para configurar o listener de onAuthStateChange (apenas uma vez na montagem)
  useEffect(() => {
    console.log("AuthContext: Configurando listener de auth state change.");

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed - Event:", event);

        if (event === "SIGNED_IN" && session?.user) {
          console.log("AuthContext: Buscando perfil para o usuário:", session.user.id);
          setLoading(true); // Ativa loading para esta operação específica
          
          const profileData = await fetchProfileForUser(session.user.id);
          
          setUser(session.user);
          setSession(session);
          setProfile(profileData);
          setRole(profileData?.role || null);
          
          setLoading(false); // Desativa loading após o perfil ser carregado
        } else if (event === "SIGNED_OUT") {
          setLoading(true); // Ativa loading para esta operação específica
          setUser(null);
          setSession(null);
          setProfile(null);
          setRole(null);
          setActiveMunicipalityIdForSuperAdmin(null);
          setLoading(false); // Desativa loading após o estado ser limpo
        }
        // Para outros eventos como TOKEN_REFRESHED, USER_UPDATED, PASSWORD_RECOVERY,
        // não precisamos de um estado de loading global, pois são geralmente passivos ou tratados localmente.
      }
    );

    // Cleanup function para desinscrever o listener quando o componente desmontar
    return () => {
      console.log("AuthContext: Desinscrevendo listener de auth state change.");
      listener.subscription.unsubscribe();
    };
  }, [fetchProfileForUser]);

  const signIn = async (email: string, password: string) => {
    console.log(`AuthContext: Tentando login para ${email}`);
    setLoading(true); // Ativa loading para a operação de login
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
    } finally {
      // setLoading(false) is handled by onAuthStateChange for SIGNED_IN event
    }
  };

  const signUp = async (email: string, password: string, name: string, role: AppRole, municipality_id?: string, school_id?: string) => {
    console.log(`AuthContext: Tentando cadastro para ${email}`);
    setLoading(true); // Ativa loading para a operação de cadastro
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
    } finally {
      // setLoading(false) is handled by onAuthStateChange for SIGNED_IN event
    }
  };

  const signOut = async () => {
    console.log("AuthContext: Tentando logout.");
    setLoading(true); // Ativa loading para a operação de logout
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
    } finally {
      // setLoading(false) is handled by onAuthStateChange for SIGNED_OUT event
    }
  };

  const value = {
    user,
    session,
    profile,
    role,
    loading,
    initialSessionChecked, // Expondo o estado de inicialização
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