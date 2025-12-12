import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Database } from "@/integrations/supabase/types";

// Types
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type AppRole = Profile["role"];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;

  sessionLoading: boolean;
  authLoading: boolean;
  operationLoading: boolean;

  initialSessionChecked: boolean;

  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    name: string,
    role: AppRole,
    municipality_id?: string,
    school_id?: string,
    cpf?: string
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;

  activeMunicipalityIdForSuperAdmin: string | null;
  setActiveMunicipalityIdForSuperAdmin: (id: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);

  const [sessionLoading, setSessionLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [operationLoading, setOperationLoading] = useState(false);
  const [initialSessionChecked, setInitialSessionChecked] = useState(false);

  const [activeMunicipalityIdForSuperAdmin, setActiveMunicipalityIdForSuperAdmin] =
    useState<string | null>(null);

  const mountedRef = useRef(true);
  const initDone = useRef(false);
  const authStateInitialized = useRef(false); // 1. Adicionado authStateInitialized ref

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ================== FETCH PROFILE =====================
  const fetchProfileForUser = useCallback(async (userId: string) => {
    try {
      console.log("AuthContext: Buscando perfil para o usuário:", userId);

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("AuthContext: Erro ao buscar perfil:", error);
        if (mountedRef.current) {
          setProfile(null);
          setRole(null);
        }
        return null;
      }

      if (mountedRef.current) {
        setProfile(profileData as Profile);
        setRole((profileData as Profile).role);
      }

      return profileData as Profile;
    } catch (err) {
      console.error("AuthContext: Exceção ao buscar perfil:", err);
      if (mountedRef.current) {
        setProfile(null);
        setRole(null);
      }
      return null;
    }
  }, []);

  // Adicionado: Função para atualizar o perfil manualmente
  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      console.log("AuthContext: Manual refreshProfile triggered for user:", user.id);
      setAuthLoading(true);
      const prof = await fetchProfileForUser(user.id);
      if (mountedRef.current) {
        setProfile(prof ?? null);
        setRole(prof?.role ?? null);
        setAuthLoading(false);
      }
    }
  }, [user?.id, fetchProfileForUser]);

  // 2. Substituído o useEffect de INIT SESSION
  // ================== INIT SESSION =====================
  useEffect(() => {
    if (initDone.current || authStateInitialized.current) return;
    initDone.current = true;
    
    const init = async () => {
      try {
        console.log("AuthContext: Recuperando sessão inicial...");
        setSessionLoading(true);

        const { data } = await supabase.auth.getSession();
        const sessionData = data?.session ?? null;

        if (sessionData?.user) {
          console.log("AuthContext: Sessão encontrada para usuário:", sessionData.user.id);
          
          // Primeiro setar o usuário básico
          setUser(sessionData.user);
          setSession(sessionData);
          
          // Depois buscar perfil
          const prof = await fetchProfileForUser(sessionData.user.id);
          
          if (prof) {
            setProfile(prof);
            setRole(prof.role);
            console.log("AuthContext: Perfil carregado com sucesso");
          } else {
            console.warn("AuthContext: Perfil não encontrado");
            // Manter user mas sem perfil
            setProfile(null);
            setRole(null);
          }
        } else {
          console.log("AuthContext: Nenhuma sessão ativa encontrada");
          setUser(null);
          setSession(null);
          setProfile(null);
          setRole(null);
        }
      } catch (err) {
        console.error("AuthContext: Erro no init()", err);
        setUser(null);
        setSession(null);
        setProfile(null);
        setRole(null);
      } finally {
        // ORDEM CRÍTICA: Primeiro sessionLoading = false, DEPOIS initialSessionChecked = true
        if (mountedRef.current) {
          setSessionLoading(false);
        }
        
        // Pequeno delay para garantir sincronização
        setTimeout(() => {
          if (mountedRef.current) {
            setInitialSessionChecked(true);
            authStateInitialized.current = true;
            console.log("AuthContext: Inicialização completa", {
              sessionLoading: false,
              initialSessionChecked: true
            });
          }
        }, 50);
      }
    };

    init();
  }, [fetchProfileForUser]);

  // 3. Substituído o AUTH LISTENER
  // ================== AUTH LISTENER =====================
  useEffect(() => {
    console.log("AuthContext: Configurando listener de auth state change.");

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, sessionData) => {
        console.log("Auth state changed - Event:", event);
        
        if (!mountedRef.current) return;

        // Ignorar eventos durante loading
        if (sessionLoading || authLoading) {
          console.log("AuthContext: Ignorando evento durante loading");
          return;
        }

        setAuthLoading(true);

        try {
          if (event === "SIGNED_IN" && sessionData?.user) {
            console.log("AuthContext: Processando SIGNED_IN");
            
            const prof = await fetchProfileForUser(sessionData.user.id);
            
            setUser(sessionData.user);
            setSession(sessionData);
            setProfile(prof ?? null);
            setRole(prof?.role ?? null);
          } 
          else if (event === "SIGNED_OUT") {
            console.log("AuthContext: Processando SIGNED_OUT");
            setUser(null);
            setSession(null);
            setProfile(null);
            setRole(null);
            setActiveMunicipalityIdForSuperAdmin(null);
          }
        } catch (error) {
          console.error("AuthContext: Erro no listener:", error);
        } finally {
          setAuthLoading(false);
        }
      }
    );

    return () => {
      console.log("AuthContext: Removendo listener");
      listener?.subscription?.unsubscribe();
    };
  }, [fetchProfileForUser, sessionLoading, authLoading]);

  // ================== AUTH OPERATIONS =====================
  const signIn = async (email: string, password: string) => {
    setOperationLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } finally {
      setOperationLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    roleParam: AppRole,
    municipality_id?: string,
    school_id?: string,
    cpf?: string
  ) => {
    setOperationLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role: roleParam, municipality_id, school_id, cpf },
        },
      });
      return { error };
    } finally {
      setOperationLoading(false);
    }
  };

  const signOut = async () => {
    setOperationLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } finally {
      setOperationLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
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
        refreshProfile,
        activeMunicipalityIdForSuperAdmin,
        setActiveMunicipalityIdForSuperAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};