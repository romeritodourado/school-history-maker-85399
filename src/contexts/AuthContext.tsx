import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { Database } from '@/integrations/supabase/types';

// Types
type Profile = Database['public']['Tables']['profiles']['Row'];
type AppRole = Profile['role'];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;

  // loading slices
  sessionLoading: boolean; // only for initial session (getSession)
  authLoading: boolean; // for auth state changes (SIGNED_IN fetch profile, token refresh)
  operationLoading: boolean; // for explicit operations: signIn/signUp/signOut

  initialSessionChecked: boolean;

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

  // separate loading states
  const [sessionLoading, setSessionLoading] = useState(true); // start as true until init runs
  const [authLoading, setAuthLoading] = useState(false);
  const [operationLoading, setOperationLoading] = useState(false);

  const [initialSessionChecked, setInitialSessionChecked] = useState(false);
  const [activeMunicipalityIdForSuperAdmin, setActiveMunicipalityIdForSuperAdmin] = useState<string | null>(null);

  // refs to avoid re-render-based closures
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // fetch profile helper
  const fetchProfileForUser = useCallback(async (userId: string) => {
    try {
      console.log('AuthContext: Buscando perfil para o usuário:', userId);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('AuthContext: Erro ao buscar perfil:', profileError);
        if (mountedRef.current) {
          setProfile(null);
          setRole(null);
        }
        return null;
      }

      if (mountedRef.current) {
        console.log('AuthContext: Perfil carregado:', profileData);
        setProfile(profileData as Profile);
        setRole((profileData as Profile).role);
      }

      return profileData as Profile;
    } catch (err) {
      console.error('AuthContext: Exceção ao buscar perfil:', err);
      if (mountedRef.current) {
        setProfile(null);
        setRole(null);
      }
      return null;
    }
  }, []);

  // 1) init: get initial session and profile exactly once
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        console.log('AuthContext: Recuperando sessão inicial...');
        setSessionLoading(true);

        const { data } = await supabase.auth.getSession();
        const sessionData = data?.session ?? null;

        if (cancelled) return;

        if (sessionData?.user) {
          if (mountedRef.current) {
            setUser(sessionData.user);
            setSession(sessionData);
          }
          await fetchProfileForUser(sessionData.user.id);
        } else {
          if (mountedRef.current) {
            setUser(null);
            setSession(null);
            setProfile(null);
            setRole(null);
            setActiveMunicipalityIdForSuperAdmin(null);
          }
        }
      } catch (err) {
        console.error('AuthContext: Erro no init()', err);
      } finally {
        if (mountedRef.current) {
          setSessionLoading(false);
          setInitialSessionChecked(true); // Sempre define como true no final da inicialização
          console.log('AuthContext: Sessão inicial recuperada. initialSessionChecked (final):', true);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [fetchProfileForUser]);

  // 2) listener: react to auth state changes
  useEffect(() => {
    console.log('AuthContext: Configurando listener de auth state change.');

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, sessionData) => {
      try {
        console.log('Auth state changed - Event:', event, 'Session Data:', sessionData);

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (sessionData?.user) {
            if (mountedRef.current) setAuthLoading(true);
            const prof = await fetchProfileForUser(sessionData.user.id);
            if (mountedRef.current) {
              setUser(sessionData.user);
              setSession(sessionData);
              setProfile(prof ?? null);
              setRole(prof?.role); // Use prof?.role directly
              setAuthLoading(false);
              console.log('AuthContext: SIGNED_IN/TOKEN_REFRESHED/USER_UPDATED. User:', sessionData.user.id, 'Profile:', prof?.id);
            }
          } else {
            // Fallback for unexpected state where event is SIGNED_IN/TOKEN_REFRESHED/USER_UPDATED but no user
            if (mountedRef.current) {
              setUser(null);
              setSession(null);
              setProfile(null);
              setRole(null);
              setActiveMunicipalityIdForSuperAdmin(null);
              setAuthLoading(false); // Ensure loading is reset even in fallback
              console.log('AuthContext: SIGNED_IN/TOKEN_REFRESHED/USER_UPDATED with no user. State cleared.');
            }
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('AuthContext: SIGNED_OUT event received. Clearing user state.');
          if (mountedRef.current) {
            setUser(null);
            setSession(null);
            setProfile(null);
            setRole(null);
            setActiveMunicipalityIdForSuperAdmin(null);
            setAuthLoading(false); // Ensure authLoading is false after sign out
            console.log('AuthContext: User state cleared. Current user is now null.');
          }
        } else if (event === 'PASSWORD_RECOVERY' || event === 'USER_DELETED') {
          // Handle other events if necessary, ensure loading states are reset
          if (mountedRef.current) {
            setAuthLoading(false);
          }
        }
        // For INITIAL_SESSION, it's handled by init() and doesn't need authLoading reset here.
      } catch (err) {
        console.error('AuthContext: Erro no listener onAuthStateChange', err);
        if (mountedRef.current) setAuthLoading(false);
      }
    });

    return () => {
      console.log('AuthContext: Desinscrevendo listener de auth state change.');
      try {
        listener.subscription.unsubscribe();
      } catch (e) {
        // ignore
      }
    };
  }, [fetchProfileForUser]); // Removed initialSessionChecked from dependencies

  // operations: signIn / signUp / signOut use operationLoading slice
  const signIn = async (email: string, password: string) => {
    console.log(`AuthContext: Tentando login para ${email}`);
    setOperationLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('AuthContext: Erro de login:', error);
        return { error };
      }
      console.log('AuthContext: Login bem-sucedido. O listener onAuthStateChange irá atualizar o estado.');
      return { error: null };
    } catch (err: any) {
      console.error('AuthContext: Exceção durante o login:', err);
      return { error: err instanceof Error ? err : new Error('Erro desconhecido durante o login') };
    } finally {
      setOperationLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string, roleParam: AppRole, municipality_id?: string, school_id?: string) => {
    console.log(`AuthContext: Tentando cadastro para ${email}`);
    setOperationLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role: roleParam, municipality_id, school_id }
        }
      });
      if (error) {
        console.error('AuthContext: Erro de cadastro:', error);
        return { error };
      }
      console.log('AuthContext: Cadastro bem-sucedido. O listener onAuthStateChange irá atualizar o estado.');
      return { error: null };
    } catch (err: any) {
      console.error('AuthContext: Exceção durante o cadastro:', err);
      return { error: err instanceof Error ? err : new Error('Erro desconhecido durante o cadastro') };
    } finally {
      setOperationLoading(false);
    }
  };

  const signOut = async () => {
    console.log('AuthContext: Tentando logout.');
    console.log('AuthContext: Estado atual antes do logout - User:', user?.id, 'Session:', session?.access_token);
    setOperationLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('AuthContext: Erro de logout:', error);
        return { error };
      }
      // Explicitamente limpar o local storage para a sessão do Supabase, por segurança
      // O formato da chave é geralmente 'sb-<project-ref>-auth-token'
      localStorage.removeItem('sb-krypnmbthyjyyzyetakb-auth-token');
      
      // Limpar imediatamente o estado local também, para garantir consistência
      if (mountedRef.current) {
        setUser(null);
        setSession(null);
        setProfile(null);
        setRole(null);
        setActiveMunicipalityIdForSuperAdmin(null);
      }

      console.log('AuthContext: Logout bem-sucedido. O listener onAuthStateChange irá atualizar o estado.');
      return { error: null };
    } catch (err: any) {
      console.error('AuthContext: Exceção durante o logout:', err);
      return { error: err instanceof Error ? err : new Error('Erro desconhecido durante o logout') };
    } finally {
      setOperationLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    role,
    sessionLoading,
    authLoading,
    operationLoading,
    initialSessionChecked,
    signIn,
    signUp,
    signOut,
    activeMunicipalityIdForSuperAdmin,
    setActiveMunicipalityIdForSuperAdmin,
  } as unknown as AuthContextType; // cast to match interface (backwards compatibility)

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};