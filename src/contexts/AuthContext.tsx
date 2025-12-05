console.log("⚡ AuthContext ATIVADO:", import.meta.url);

import React, {
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

  sessionLoading: boolean; // Indica se a sessão inicial está sendo carregada
  authLoading: boolean;    // Indica se uma operação de autenticação (login/cadastro/logout) ou busca de perfil está em andamento
  operationLoading: boolean; // Indica se uma operação explícita de login/cadastro/logout está em andamento

  initialSessionChecked: boolean; // Verdadeiro após a primeira verificação de sessão ser concluída

  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    name: string,
    role: AppRole,
    municipality_id?: string,
    school_id?: string
  ) => Promise<{ error: Error | null }>;
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

  const [sessionLoading, setSessionLoading] = useState(true); // Para a verificação inicial da sessão
  const [authLoading, setAuthLoading] = useState(false);    // Para qualquer mudança de estado de autenticação que envolva buscar o perfil
  const [operationLoading, setOperationLoading] = useState(false); // Para chamadas explícitas de signIn/signUp/signOut
  const [initialSessionChecked, setInitialSessionChecked] = useState(false);

  const [activeMunicipalityIdForSuperAdmin, setActiveMunicipalityIdForSuperAdmin] =
    useState<string | null>(null);

  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // =============== FETCH PROFILE ===================
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

  // =============== AUTH LISTENER ===================
  useEffect(() => {
    console.log("AuthContext: Configurando listener de auth state change.");

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, sessionData) => {
        console.log(
          "Auth state changed - Event:",
          event,
          "Session:",
          sessionData
        );

        // Define authLoading como true para eventos que buscarão o perfil
        if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          setAuthLoading(true);
        }

        if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          if (sessionData?.user) {
            setUser(sessionData.user);
            setSession(sessionData);
            await fetchProfileForUser(sessionData.user.id);
          } else {
            // Se sessionData.user for null para esses eventos, significa que nenhum usuário está logado
            setUser(null);
            setSession(null);
            setProfile(null);
            setRole(null);
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setSession(null);
          setProfile(null);
          setRole(null);
          setActiveMunicipalityIdForSuperAdmin(null);
        }

        // Sempre define initialSessionChecked como true após o primeiro evento, independentemente da presença do usuário
        if (!initialSessionChecked) {
          setInitialSessionChecked(true);
        }
        setSessionLoading(false); // A verificação inicial da sessão é feita após o primeiro evento

        setAuthLoading(false); // Redefine authLoading após processar o evento
      }
    );

    return () => {
      try {
        listener.subscription.unsubscribe();
      } catch {}
    };
  }, [fetchProfileForUser, initialSessionChecked]); // Adicionado initialSessionChecked às dependências para garantir que esteja atualizado

  // =============== Auth Operations ===================
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
    school_id?: string
  ) => {
    setOperationLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role: roleParam, municipality_id, school_id },
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