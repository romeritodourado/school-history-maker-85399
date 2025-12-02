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
  initializing: boolean; // Adicionado o estado de inicialização
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
  const [initializing, setInitializing] = useState(true); // Novo estado para a carga inicial da sessão
  const [activeMunicipalityIdForSuperAdmin, setActiveMunicipalityIdForSuperAdmin] = useState<string | null>(null);

  // Usamos useRef para o user para que o useEffect não precise depender do estado 'user'
  // e, assim, não seja recriado em cada mudança de 'user'.
  const userRef = useRef<User | null>(null);

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
      setInitializing(true); // Garante que está true no início da inicialização
      
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        setUser(data.session.user);
        setSession(data.session);
        userRef.current = data.session.user;
        await fetchProfileForUser(data.session.user.id);
      } else {
        setUser(null);
        setSession(null);
        setProfile(null);
        setRole(null);
        setActiveMunicipalityIdForSuperAdmin(null);
        userRef.current = null;
      }

      setInitializing(false); // Libera o ProtectedRoute após a checagem inicial
      console.log("AuthContext: Sessão inicial recuperada. Initializing: false.");
    };

    getInitialSession();
  }, [fetchProfileForUser]); // Depende de fetchProfileForUser para garantir que a função esteja atualizada

  // Efeito para configurar o listener de onAuthStateChange (apenas uma vez na montagem)
  useEffect(() => {
    console.log("AuthContext: Configurando listener de auth state change.");

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed - Event:", event);

        // User's suggestion: Set initializing to false on SIGNED_IN event
        if (event === "SIGNED_IN") {
          setInitializing(false);     // <-- IMPORTANTE
        }

        // 🔥 EVITA DUPLICATE SIGNED_IN (previous fix)
        if (event === "SIGNED_IN" && userRef.current) {
          console.log("AuthContext: Ignorando SIGNED_IN duplicado.");
          return;
        }

        // Apenas mostramos o loading para eventos que realmente mudam o estado de autenticação
        // e não para refreshes passivos de token.
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') { // INITIAL_SESSION is handled by getInitialSession
          setLoading(true);
        }
        
        if (!session) {
          setUser(null);
          setSession(null);
          setProfile(null);
          setRole(null);
          setActiveMunicipalityIdForSuperAdmin(null);
          userRef.current = null;
        } else {
          setUser(session.user);
          setSession(session);
          userRef.current = session.user;
          await fetchProfileForUser(session.user.id);
        }
        
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          setLoading(false);
        }
      }
    );

    // Cleanup function para desinscrever o listener quando o componente desmontar
    return () => {
      console.log("AuthContext: Desinscrevendo listener de auth state change.");
      listener.subscription.unsubscribe();
    };
  }, [fetchProfileForUser]); // Depende de fetchProfileForUser

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
      setLoading(false); // Desativa loading após a operação
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
      setLoading(false); // Desativa loading após a operação
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
      setLoading(false); // Desativa loading após a operação
    }
  };

  const value = {
    user,
    session,
    profile,
    role,
    loading,
    initializing, // Expondo o estado de inicialização
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