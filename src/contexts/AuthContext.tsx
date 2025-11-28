import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { loginSchema, signupSchema } from '@/lib/validationSchemas';

type AppRole = 'super_admin' | 'municipal_secretary' | 'network_manager' | 'school_admin' | 'secretary' | 'assistente_administrativo';

interface Profile {
  id: string;
  email: string | null;
  name: string | null;
  municipality_id: string | null;
  school_id: string | null;
  role: AppRole;
  created_at: string | null;
  updated_at: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string, role: AppRole, municipalityId?: string, schoolId?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasPermission: (requiredRoles: AppRole[]) => boolean;
  fetchProfile: (userId: string) => Promise<void>;
  activeMunicipalityIdForSuperAdmin: string | null;
  setActiveMunicipalityIdForSuperAdmin: (id: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true); // Começa como true para indicar carregamento inicial
  const [activeMunicipalityIdForSuperAdmin, setActiveMunicipalityIdForSuperAdmin] = useState<string | null>(null);

  // A função fetchProfile não é mais usada diretamente no onAuthStateChange,
  // mas é mantida para outros usos, se houver.
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data as Profile);
      setRole(data.role as AppRole);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
      setRole(null);
    }
  };

  useEffect(() => {
    console.log('AuthContext: Setting up auth state listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("AuthContext: onAuthStateChange event:", event, "Session:", session);

        if (!session) {
          console.log("AuthContext: No session found, clearing user and profile.");
          setUser(null);
          setProfile(null);
          setRole(null);
          setActiveMunicipalityIdForSuperAdmin(null); // Garante que este estado também seja limpo
          setLoading(false);
          return;
        }

        // Sessão existe → buscar o profile
        const user = session.user;
        setUser(user);

        try {
          console.log("AuthContext: Fetching profile...");
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          if (profileError) {
            console.error("AuthContext: Profile fetch error:", profileError);
          }

          console.log("AuthContext: Profile data received:", profileData);
          setProfile(profileData || null);
          setRole(profileData?.role || null);
        } catch (err) {
          console.error("AuthContext: Unexpected profile error:", err);
          setProfile(null); // Limpa o perfil em caso de erro inesperado
          setRole(null);    // Limpa o papel em caso de erro inesperado
        }

        console.log("AuthContext: Finished loading.");
        setLoading(false);
      }
    );

    return () => {
      console.log('AuthContext: Unsubscribing from auth state changes.');
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array for a single setup on mount

  useEffect(() => {
    if (!user?.id) return;

    // Listener para mudanças em tempo real no perfil do usuário
    const profileChannel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Profile updated:', payload);
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setProfile(payload.new as Profile);
            setRole((payload.new as Profile).role);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [user?.id]);


  const signIn = async (email: string, password: string) => {
    try {
      loginSchema.parse({ email, password });
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, name: string, role: AppRole, municipalityId?: string, schoolId?: string) => {
    try {
      signupSchema.parse({ email, password, name });
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) return { error };

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: data.user.email,
            name: name,
            role: role,
            municipality_id: municipalityId || null,
            school_id: schoolId || null,
          });

        if (profileError) throw profileError;
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setActiveMunicipalityIdForSuperAdmin(null);
  };

  const hasPermission = (requiredRoles: AppRole[]) => {
    if (!role) return false;
    return requiredRoles.includes(role);
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
    hasPermission,
    fetchProfile,
    activeMunicipalityIdForSuperAdmin,
    setActiveMunicipalityIdForSuperAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}