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
  
  isLoading: boolean; // Único estado de loading
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
  
  const [isLoading, setIsLoading] = useState(true); // Único loading
  const [initialSessionChecked, setInitialSessionChecked] = useState(false);

  const [activeMunicipalityIdForSuperAdmin, setActiveMunicipalityIdForSuperAdmin] =
    useState<string | null>(null);

  const mountedRef = useRef(true);
  const initialized = useRef(false);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ================== FETCH PROFILE =====================
  const fetchProfileForUser = useCallback(async (userId: string) => {
    try {
      console.log("AuthContext: Buscando perfil para:", userId);

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("AuthContext: Erro ao buscar perfil:", error);
        return null;
      }

      return profileData as Profile;
    } catch (err) {
      console.error("AuthContext: Exceção ao buscar perfil:", err);
      return null;
    }
  }, []);

  // ================== INIT SESSION (SIMPLIFICADO) =====================
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initAuth = async () => {
      console.log("AuthContext: Iniciando verificação de sessão...");
      setIsLoading(true);

      try {
        // 1. Pegar sessão atual
        const { data } = await supabase.auth.getSession();
        const currentSession = data?.session;

        console.log("AuthContext: Sessão encontrada?", !!currentSession);

        if (currentSession?.user) {
          console.log("AuthContext: Usuário encontrado:", currentSession.user.id);
          
          // 2. Buscar perfil
          const userProfile = await fetchProfileForUser(currentSession.user.id);
          
          if (userProfile) {
            console.log("AuthContext: Perfil encontrado, autenticando...");
            setUser(currentSession.user);
            setSession(currentSession);
            setProfile(userProfile);
            setRole(userProfile.role);
          } else {
            console.warn("AuthContext: Perfil não encontrado, limpando sessão");
            // Se não tem perfil, não considera autenticado
            setUser(null);
            setSession(null);
            setProfile(null);
            setRole(null);
          }
        } else {
          console.log("AuthContext: Nenhuma sessão ativa");
          setUser(null);
          setSession(null);
          setProfile(null);
          setRole(null);
        }
      } catch (error) {
        console.error("AuthContext: Erro na inicialização:", error);
        setUser(null);
        setSession(null);
        setProfile(null);
        setRole(null);
      } finally {
        // FINALMENTE: Marcar como completo
        if (mountedRef.current) {
          setInitialSessionChecked(true);
          setIsLoading(false);
          console.log("AuthContext: Verificação completa!", {
            isLoading: false,
            initialSessionChecked: true,
            user: user?.id || 'null'
          });
        }
      }
    };

    initAuth();
  }, [fetchProfileForUser]);

  // ================== AUTH LISTENER (SIMPLIFICADO) =====================
  useEffect(() => {
    console.log("AuthContext: Configurando listener de auth...");

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log("AuthContext: Evento recebido:", event);
        
        if (!mountedRef.current) return;

        // Não definir isLoading=true se for apenas um evento de token refresh
        if (event !== "TOKEN_REFRESHED") {
          setIsLoading(true);
        }

        try {
          if (event === "SIGNED_IN" && newSession?.user) {
            console.log("AuthContext: Usuário autenticado:", newSession.user.id);
            const userProfile = await fetchProfileForUser(newSession.user.id);
            
            if (userProfile) {
              setUser(newSession.user);
              setSession(newSession);
              setProfile(userProfile);
              setRole(userProfile.role);
            }
          } 
          else if (event === "SIGNED_OUT") {
            console.log("AuthContext: Usuário desconectado");
            setUser(null);
            setSession(null);
            setProfile(null);
            setRole(null);
            setActiveMunicipalityIdForSuperAdmin(null);
          }
          else if (event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
            if (newSession?.user) {
              console.log("AuthContext: Atualizando dados do usuário");
              const userProfile = await fetchProfileForUser(newSession.user.id);
              
              if (userProfile) {
                setUser(newSession.user);
                setSession(newSession);
                setProfile(userProfile);
                setRole(userProfile.role);
              }
            }
          }
        } catch (error) {
          console.error("AuthContext: Erro no listener:", error);
        } finally {
          if (mountedRef.current) {
            setIsLoading(false);
          }
        }
      }
    );

    return () => {
      console.log("AuthContext: Removendo listener");
      listener?.subscription?.unsubscribe();
    };
  }, [fetchProfileForUser]);

  // ================== AUTH OPERATIONS =====================
  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } finally {
      // O listener de auth fará o trabalho de setar o estado final,
      // mas garantimos que o loading seja desligado em caso de erro de operação.
      // Se a operação for bem sucedida, o listener irá setar isLoading=false.
      // Se falhar, precisamos desligar o loading aqui.
      // No entanto, para evitar conflitos com o listener, vamos deixar o listener gerenciar o estado final.
      // Apenas garantimos que o listener é chamado.
      // Se houver erro, o listener não é chamado, então precisamos desligar o loading.
      if (user) { // Se o usuário foi setado pelo listener, não faz nada
        return;
      }
      setIsLoading(false);
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
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      setIsLoading(true);
      const prof = await fetchProfileForUser(user.id);
      if (mountedRef.current) {
        setProfile(prof ?? null);
        setRole(prof?.role ?? null);
        setIsLoading(false);
      }
    }
  }, [user?.id, fetchProfileForUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        isLoading,
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