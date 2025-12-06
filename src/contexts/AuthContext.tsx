// src/contexts/AuthContext.tsx
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

  const [sessionLoading, setSessionLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [operationLoading, setOperationLoading] = useState(false);
  const [initialSessionChecked, setInitialSessionChecked] = useState(false);

  const [activeMunicipalityIdForSuperAdmin, setActiveMunicipalityIdForSuperAdmin] =
    useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Fetch profile for a given userId (safe w/ mountedRef)
  const fetchProfileForUser = useCallback(async (userId: string) => {
    try {
      console.log("AuthContext: Buscando perfil para o usuário:", userId);
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.warn("AuthContext: Erro ao buscar perfil:", error);
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

  // Centraliza processamento de uma session (usado por init e listener)
  const processSession = useCallback(
    async (sessionData: Session | null) => {
      try {
        if (!mountedRef.current) return;
        if (sessionData?.user) {
          console.log("AuthContext: processSession -> session com usuário:", sessionData.user.id);
          // sinaliza que estamos processando (pode mostrar loader no UI se quiser)
          setAuthLoading(true);

          setUser(sessionData.user);
          setSession(sessionData);

          const prof = await fetchProfileForUser(sessionData.user.id);

          if (!mountedRef.current) return;

          setProfile(prof ?? null);
          setRole(prof?.role ?? null);
          setAuthLoading(false);
        } else {
          // Sem sessão ativa
          console.log("AuthContext: processSession -> sem sessão ativa");
          setUser(null);
          setSession(null);
          setProfile(null);
          setRole(null);
        }
      } catch (err) {
        console.error("AuthContext: Erro em processSession:", err);
        if (mountedRef.current) {
          setAuthLoading(false);
        }
      }
    },
    [fetchProfileForUser]
  );

  // INIT: getSession() -> processSession -> marcar initialSessionChecked
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        console.log("AuthContext: Recuperando sessão inicial...");
        setSessionLoading(true);

        const { data } = await supabase.auth.getSession();
        const sessionData = data?.session ?? null;

        await processSession(sessionData);
      } catch (err) {
        console.error("AuthContext: Erro no init()", err);
      } finally {
        if (cancelled || !mountedRef.current) return;
        setSessionLoading(false);
        setInitialSessionChecked(true);
        console.log("AuthContext: initialSessionChecked=true (init completo)");
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [processSession]);

  // AUTH LISTENER: registrado apenas uma vez
  useEffect(() => {
    console.log("AuthContext: Configurando listener de auth state change.");
    const { data } = supabase.auth.onAuthStateChange(async (_event, sessionData) => {
      try {
        // sessionData pode ser null
        await processSession(sessionData ?? null);
      } catch (err) {
        console.error("AuthContext: Erro no listener:", err);
      }
    });

    // data.subscription é a forma compatível com supabase v2
    const subscription = (data as any)?.subscription ?? null;

    return () => {
      console.log("AuthContext: Removendo listener de auth state change.");
      try {
        subscription?.unsubscribe?.();
      } catch (err) {
        console.warn("AuthContext: Erro ao desinscrever listener:", err);
      }
    };
  }, [processSession]);

  // =============== AUTH OPERATIONS ===============
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
