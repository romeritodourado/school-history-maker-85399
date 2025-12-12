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
  
  isLoading: boolean;
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

console.log("🔥 AuthContext.tsx CARREGADO - Versão Debug " + new Date().toISOString());

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  console.log("🔥 AuthProvider: Componente montado");
  
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [initialSessionChecked, setInitialSessionChecked] = useState(false);

  const [activeMunicipalityIdForSuperAdmin, setActiveMunicipalityIdForSuperAdmin] =
    useState<string | null>(null);

  const mountedRef = useRef(true);
  const initialized = useRef(false);

  // Log de estado
  useEffect(() => {
    console.log("📊 AuthProvider: Estado atualizado", {
      user: user?.id || 'null',
      profile: profile?.id || 'null',
      isLoading,
      initialSessionChecked,
      timestamp: new Date().toISOString()
    });
  }, [user, profile, isLoading, initialSessionChecked]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      console.log("🔌 AuthProvider: Desmontado");
    };
  }, []);

  // ================== FETCH PROFILE =====================
  const fetchProfileForUser = useCallback(async (userId: string) => {
    try {
      console.log("🔍 AuthContext: Buscando perfil para:", userId);

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("❌ AuthContext: Erro ao buscar perfil:", error);
        return null;
      }

      console.log("✅ AuthContext: Perfil encontrado:", profileData.id);
      return profileData as Profile;
    } catch (err) {
      console.error("❌ AuthContext: Exceção ao buscar perfil:", err);
      return null;
    }
  }, []);

  // ================== INIT SESSION (VERSÃO CORRIGIDA) =====================
  useEffect(() => {
    console.log("🔄 AuthContext: useEffect de init session executado");
    
    if (initialized.current) {
      console.log("⏭️ AuthContext: Já inicializado, ignorando...");
      return;
    }
    
    initialized.current = true;

    const initAuth = async () => {
      console.log("🚀 AuthContext: Iniciando verificação de sessão...");

      // NÃO setar isLoading aqui - já está true por padrão

      try {
        console.log("📞 AuthContext: Chamando supabase.auth.getSession()");
        const { data } = await supabase.auth.getSession();
        const currentSession = data?.session;

        console.log("📋 AuthContext: Resposta getSession:", {
          hasSession: !!currentSession,
          userId: currentSession?.user?.id || 'null'
        });

        if (currentSession?.user) {
          console.log("👤 AuthContext: Usuário encontrado:", currentSession.user.id);
          
          const userProfile = await fetchProfileForUser(currentSession.user.id);
          
          if (userProfile) {
            console.log("✅ AuthContext: Perfil encontrado, autenticando...");
            setUser(currentSession.user);
            setSession(currentSession);
            setProfile(userProfile);
            setRole(userProfile.role);
          } else {
            console.warn("⚠️ AuthContext: Perfil não encontrado");
            setUser(null);
            setSession(null);
            setProfile(null);
            setRole(null);
          }
        } else {
          console.log("👻 AuthContext: Nenhuma sessão ativa");
          setUser(null);
          setSession(null);
          setProfile(null);
          setRole(null);
        }
      } catch (error) {
        console.error("💥 AuthContext: Erro na inicialização:", error);
        setUser(null);
        setSession(null);
        setProfile(null);
        setRole(null);
      } finally {
        console.log("🏁 AuthContext: Finalizando verificação...");
        
        // ORDEM CRÍTICA: primeiro setInitialSessionChecked, DEPOIS setIsLoading
        setInitialSessionChecked(true);
        
        // Pequeno delay para garantir que o estado seja atualizado
        setTimeout(() => {
          if (mountedRef.current) {
            setIsLoading(false);
            console.log("🎉 AuthContext: VERIFICAÇÃO COMPLETA!", {
              isLoading: false,
              initialSessionChecked: true,
              user: user?.id || 'null'
            });
            console.log("==========================================");
          }
        }, 50);
      }
    };

    initAuth();
  }, [fetchProfileForUser]);

  // ================== AUTH LISTENER (SIMPLIFICADO) =====================
  useEffect(() => {
    console.log("🎧 AuthContext: Configurando listener de auth...");

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log("🔄 AuthContext: Evento recebido:", event);
        
        if (!mountedRef.current) return;

        // Só mostrar loading para eventos significativos
        if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
          setIsLoading(true);
        }

        try {
          if (event === "SIGNED_IN" && newSession?.user) {
            console.log("✅ AuthContext: Usuário autenticado:", newSession.user.id);
            const userProfile = await fetchProfileForUser(newSession.user.id);
            
            if (userProfile) {
              setUser(newSession.user);
              setSession(newSession);
              setProfile(userProfile);
              setRole(userProfile.role);
            }
          } 
          else if (event === "SIGNED_OUT") {
            console.log("👋 AuthContext: Usuário desconectado");
            setUser(null);
            setSession(null);
            setProfile(null);
            setRole(null);
            setActiveMunicipalityIdForSuperAdmin(null);
          }
        } catch (error) {
          console.error("❌ AuthContext: Erro no listener:", error);
        } finally {
          if (mountedRef.current && (event === "SIGNED_IN" || event === "SIGNED_OUT")) {
            setIsLoading(false);
          }
        }
      }
    );

    return () => {
      console.log("🔇 AuthContext: Removendo listener");
      listener?.subscription?.unsubscribe();
    };
  }, [fetchProfileForUser]);

  // ================== AUTH OPERATIONS (CORRIGIDAS) =====================
  const signIn = async (email: string, password: string) => {
    console.log("🔐 AuthContext: signIn chamado");
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } finally {
      // O listener vai lidar com o setIsLoading(false) quando o evento SIGNED_IN chegar
      // Se houver erro, o listener não será chamado, então desativamos o loading aqui
      setTimeout(() => {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }, 3000); // Timeout de segurança
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
      // O listener vai lidar com o setIsLoading(false) quando o evento SIGNED_OUT chegar
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