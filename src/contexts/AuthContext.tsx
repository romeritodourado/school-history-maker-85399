import React,
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
    cpf?: string // NOVO: Adicionado CPF
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>; // Adicionado: Função para atualizar o perfil

  activeMunicipalityIdForSuperAdmin: string | null;
  setActiveMunicipalityIdForSuperAdmin: (id: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { React.ReactNode }) => {
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
  const sessionInitialized = useRef(false);

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

  // ================== INIT SESSION =====================
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    const init = async () => {
      try {
        console.log("AuthContext: Recuperando sessão inicial...");
        setSessionLoading(true);

        const { data } = await supabase.auth.getSession();
        const sessionData = data?.session ?? null;

        if (sessionData?.user) {
          console.log("AuthContext: Processando sessão inicial do usuário:", sessionData.user.id);
          setUser(sessionData.user);
          setSession(sessionData);
          const prof = await fetchProfileForUser(sessionData.user.id);
          
          if (!prof) {
            console.warn("AuthContext: Perfil não encontrado para o usuário:", sessionData.user.id);
            // If profile not found, consider user not fully authenticated for app purposes
            setUser(null);
            setSession(null);
            setProfile(null);
            setRole(null);
          } else {
            setProfile(prof);
            setRole(prof.role);
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
        // Ensure state is cleared on error
        setUser(null);
        setSession(null);
        setProfile(null);
        setRole(null);
      } finally {
        // Ensure these are set regardless of success or failure
        if (mountedRef.current) {
          setInitialSessionChecked(true); // Mark initial check as complete
          setSessionLoading(false);      // Stop session loading
        }
      }
    };

    init();
  }, [fetchProfileForUser]);

  // ================== AUTH LISTENER =====================
  useEffect(() => {
    console.log("AuthContext: Configurando listener de auth state change.");

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, sessionData) => {
        console.log("Auth state changed - Event:", event, "Session:", sessionData?.user?.id);

        // Evitar processamento duplicado do SIGNED_IN
        if (event === "SIGNED_IN" && sessionData?.user) {
          // Se a sessão já foi inicializada com este mesmo usuário, ignorar
          if (sessionInitialized.current && user?.id === sessionData.user.id) {
            console.log("AuthContext: SIGNED_IN recebido para usuário já autenticado, ignorando.");
            return;
          }
          
          console.log("AuthContext: Processando SIGNED_IN para usuário:", sessionData.user.id);
          sessionInitialized.current = true;
          setAuthLoading(true);
          
          const prof = await fetchProfileForUser(sessionData.user.id);

          if (mountedRef.current) {
            setUser(sessionData.user);
            setSession(sessionData);
            setProfile(prof ?? null);
            setRole(prof?.role ?? null);
            setAuthLoading(false);
          }
        } 
        else if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          if (sessionData?.user) {
            console.log("AuthContext: Atualizando dados do usuário:", sessionData.user.id);
            setAuthLoading(true);
            
            const prof = await fetchProfileForUser(sessionData.user.id);

            if (mountedRef.current) {
              setUser(sessionData.user);
              setSession(sessionData);
              setProfile(prof ?? null);
              setRole(prof?.role ?? null);
              setAuthLoading(false);
            }
          }
        } 
        else if (event === "SIGNED_OUT") {
          console.log("AuthContext: Processando SIGNED_OUT");
          sessionInitialized.current = false;
          if (mountedRef.current) {
            setUser(null);
            setSession(null);
            setProfile(null);
            setRole(null);
            setActiveMunicipalityIdForSuperAdmin(null);
            setAuthLoading(false);
          }
        }
      }
    );

    return () => {
      console.log("AuthContext: Removendo listener de auth state change.");
      try {
        listener.subscription.unsubscribe();
      } catch (err) {
        console.warn("AuthContext: Erro ao desinscrever listener:", err);
      }
    };
  }, [fetchProfileForUser, user?.id]);

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
    cpf?: string // NOVO: Adicionado CPF
  ) => {
    setOperationLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role: roleParam, municipality_id, school_id, cpf }, // NOVO: Incluir CPF
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
        refreshProfile, // Adicionado
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