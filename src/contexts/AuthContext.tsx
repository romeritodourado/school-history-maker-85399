import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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

  // Use refs to get the latest state values in console.log
  const userRef = useRef(user);
  const profileRef = useRef(profile);
  const roleRef = useRef(role);

  useEffect(() => {
    userRef.current = user;
    profileRef.current = profile;
    roleRef.current = role;
  }, [user, profile, role]);

  const fetchUserProfileAndRole = async (userId: string) => {
    console.log("AuthContext: fetchUserProfileAndRole - Iniciando busca de perfil para userId:", userId);
    try {
      console.log("AuthContext: fetchUserProfileAndRole - Executando query Supabase...");
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      console.log("DEBUG SUPABASE: Resultado da query - data:", data, "error:", error); 

      if (error && error.code === 'PGRST116') { // No rows found
        console.warn("AuthContext: fetchUserProfileAndRole - Nenhum perfil encontrado para o userId:", userId, ". Pode ser um novo usuário sem perfil ainda.");
        setProfile(null);
        setRole(null);
      } else if (error) {
        console.error("AuthContext: fetchUserProfileAndRole - Erro na query do Supabase:", error);
        setProfile(null);
        setRole(null);
      } else if (data) {
        console.log("AuthContext: fetchUserProfileAndRole - Perfil encontrado. Role:", data.role);
        setProfile(data);
        setRole(data.role);
        console.log("AuthContext: fetchUserProfileAndRole - Profile e role definidos no estado.");
      } else {
        console.log("AuthContext: fetchUserProfileAndRole - Nenhum dado de perfil retornado, mas sem erro. Definindo profile/role como null.");
        setProfile(null);
        setRole(null);
      }
    } catch (error) {
      console.error("AuthContext: fetchUserProfileAndRole - Erro capturado:", error);
      setProfile(null);
      setRole(null);
    }
  };

  useEffect(() => {
    console.log("AuthContext: useEffect - Configurando listener de estado de autenticação...");
    setLoading(true); // Garante que o loading é true no início do efeito

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("AuthContext: onAuthStateChange - Evento:", event, "Sessão:", session);
        // Apenas define loading como true se esperamos uma mudança que requer busca de dados
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
          setLoading(true);
        }

        try {
          if (session?.user) {
            console.log("AuthContext: onAuthStateChange - Usuário na sessão. Definindo user e session.");
            setUser(session.user);
            setSession(session);
            await fetchUserProfileAndRole(session.user.id);
          } else {
            console.log("AuthContext: onAuthStateChange - Nenhum usuário na sessão. Resetando estado de autenticação.");
            setUser(null);
            setSession(null);
            setProfile(null);
            setRole(null);
            setActiveMunicipalityIdForSuperAdmin(null);
          }
        } catch (error) {
          console.error("AuthContext: onAuthStateChange - Erro durante a busca de perfil:", error);
          setUser(null);
          setSession(null);
          setProfile(null);
          setRole(null);
          setActiveMunicipalityIdForSuperAdmin(null);
        } finally {
          // Garante que loading seja false apenas após todas as atualizações de estado serem tentadas
          setLoading(false);
          console.log("AuthContext: onAuthStateChange - Finalizado. Estado final: user=", !!userRef.current, "profile=", !!profileRef.current, "role=", roleRef.current, "loading=", false);
        }
      }
    );

    // Verificação inicial da sessão para garantir que o estado seja populado rapidamente na montagem
    // Isso é importante para o caso de um refresh de página onde o listener pode ter um pequeno delay.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log("AuthContext: getSession inicial - Sessão encontrada:", session);
      if (session?.user && !userRef.current) { // Apenas se o usuário não foi definido pelo listener ainda
        console.log("AuthContext: getSession inicial - Usuário encontrado, buscando perfil.");
        setUser(session.user);
        setSession(session);
        await fetchUserProfileAndRole(session.user.id);
      } else if (!session?.user && userRef.current) { // Usuário estava no estado, mas a sessão sumiu
        console.log("AuthContext: getSession inicial - Nenhuma sessão encontrada, mas user estava no estado. Resetando.");
        setUser(null);
        setSession(null);
        setProfile(null);
        setRole(null);
        setActiveMunicipalityIdForSuperAdmin(null);
      }
      setLoading(false); // Define loading como false após a verificação inicial da sessão
      console.log("AuthContext: getSession inicial - Verificação finalizada. Estado final: user=", !!userRef.current, "profile=", !!profileRef.current, "role=", roleRef.current, "loading=", false);
    });


    return () => {
      console.log('AuthContext: useEffect - Desinscrevendo do listener...');
      subscription.unsubscribe();
    };
  }, []); // Array de dependências vazio para rodar uma vez na montagem

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setLoading(false);
        return { error };
      }
      return { error: null };
    } catch (error: any) {
      console.error("AuthContext: Erro durante signIn:", error);
      setLoading(false);
      return { error: error instanceof Error ? error : new Error("Erro desconhecido durante o login.") };
    }
  };

  const signUp = async (email: string, password: string, name: string, role: AppRole, municipality_id?: string, school_id?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role, municipality_id, school_id },
        },
      });

      if (error) {
        setLoading(false);
        return { error };
      }
      return { error: null };
    } catch (error: any) {
      console.error("AuthContext: Erro durante signUp:", error);
      setLoading(false);
      return { error: error instanceof Error ? error : new Error("Erro desconhecido durante o cadastro.") };
    }
  };

  const signOut = async () => {
    console.log("AuthContext: Tentando fazer logout...");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("AuthContext: Erro durante logout:", error);
        setLoading(false);
      }
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