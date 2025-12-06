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
  const initDone = useRef(false);
  const sessionInitialized = useRef(false);
  const didFetchInitialProfile = useRef(false);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

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

        if (sessionData?.user && !didFetchInitialProfile.current) {
          didFetchInitialProfile.current = true;
          console.log("AuthContext: Processando sessão inicial do usuário:", sessionData.user.id);
          setUser(sessionData.user);
          setSession(sessionData);
          await fetchProfileForUser(sessionData.user.id);
        } else if (!sessionData?.user) {
          console.log("AuthContext: Nenhuma sessão ativa encontrada");
          setUser(null);
          setSession(null);
          setProfile(null);
          setRole(null);
        }
      } catch (err) {
        console.error("AuthContext: Erro no init()", err);
