import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type AppRole = Profile["role"];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: AppRole | null; // Mantendo o role para facilitar o uso em outros componentes
  isLoading: boolean;
  isInitialized: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>; // Mantendo refreshProfile para atualizações de perfil
  activeMunicipalityIdForSuperAdmin: string | null; // Mantendo estados específicos
  setActiveMunicipalityIdForSuperAdmin: (id: string | null) => void; // Mantendo estados específicos
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Debug counter
if (typeof window !== 'undefined') {
  (window as any).__authContextLoads = ((window as any).__authContextLoads || 0) + 1;
  console.log(`🔄 AuthContext carregado ${(window as any).__authContextLoads} vez(es)`);
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  console.log("🚀 AuthProvider iniciado");
  
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const [activeMunicipalityIdForSuperAdmin, setActiveMunicipalityIdForSuperAdmin] =
    useState<string | null>(null);
  
  const mountedRef = useRef(true);
  const initStartedRef = useRef(false);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Função auxiliar para buscar perfil
  const fetchProfileForUser = async (userId: string) => {
    const { data: profileData, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    
    if (error) {
      console.error("❌ AuthContext: Erro ao buscar perfil:", error);
      return null;
    }
    return profileData as Profile;
  };

  // ================== INICIALIZAÇÃO ÚNICA =====================
  useEffect(() => {
    console.log("🎯 useEffect de inicialização executado");
    
    if (initStartedRef.current) {
      console.log("⏭️ Inicialização já em andamento, ignorando");
      return;
    }
    
    initStartedRef.current = true;
    
    const initialize = async () => {
      console.log("🔐 Iniciando verificação de autenticação...");
      
      let currentUser: User | null = null;
      let currentProfile: Profile | null = null;
      
      try {
        // 1. Buscar sessão atual
        const { data: { session } } = await supabase.auth.getSession();
        console.log("📋 Sessão encontrada?", !!session);
        
        if (session?.user) {
          console.log("👤 Usuário encontrado:", session.user.id);
          
          // 2. Buscar perfil
          const profileData = await fetchProfileForUser(session.user.id);
          
          if (profileData) {
            console.log("✅ Perfil encontrado:", profileData.id);
            currentUser = session.user;
            currentProfile = profileData;
          } else {
            console.warn("⚠️ Perfil não encontrado. Tratando como não autenticado.");
          }
        } else {
          console.log("👻 Nenhuma sessão ativa");
        }
        
      } catch (error) {
        console.error("💥 Erro na inicialização:", error);
      } finally {
        // ⭐⭐ ORDEM CRÍTICA: Atualizar estados de uma vez ⭐⭐
        if (mountedRef.current) {
          setUser(currentUser);
          setProfile(currentProfile);
          setRole(currentProfile?.role || null);
          
          setIsInitialized(true);
          
          // Pequeno delay para garantir propagação do estado
          setTimeout(() => {
            if (mountedRef.current) {
              setIsLoading(false);
              console.log("🎉 AUTENTICAÇÃO INICIALIZADA!", {
                user: currentUser?.id || 'null',
                profile: currentProfile?.id || 'null',
                isLoading: false,
                isInitialized: true
              });
            }
          }, 50);
        }
      }
    };
    
    // Delay estratégico para evitar race conditions
    const timer = setTimeout(() => {
      initialize();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // ================== OPERAÇÕES =====================
  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (!error) {
        // Recarregar a página para reinicializar tudo
        window.location.reload();
      }
      
      return { error };
    } finally {
      if (mountedRef.current) {
        // Se houve erro, desativar loading após um breve período
        setTimeout(() => {
          if (mountedRef.current) setIsLoading(false);
        }, 500);
      }
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
      await supabase.auth.signOut();
      
      // Limpeza explícita do localStorage para garantir que não haja tokens antigos
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase.auth')) {
          localStorage.removeItem(key);
        }
      });
      
      // Recarregar a página para reinicializar tudo
      window.location.reload();
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };
  
  const refreshProfile = async () => {
    if (user?.id) {
      setIsLoading(true);
      const prof = await fetchProfileForUser(user.id);
      if (mountedRef.current) {
        setProfile(prof ?? null);
        setRole(prof?.role ?? null);
        setIsLoading(false);
      }
    }
  };

  // ================== CONTEXT VALUE =====================
  const contextValue: AuthContextType = {
    user,
    profile,
    role,
    isLoading,
    isInitialized,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    activeMunicipalityIdForSuperAdmin,
    setActiveMunicipalityIdForSuperAdmin,
  };

  console.log("📊 AuthProvider renderizando, estado:", {
    user: user?.id || 'null',
    profile: profile?.id || 'null',
    isLoading,
    isInitialized
  });

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};