import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { Database } from '@/integrations/supabase/types';

// Define types for profile and role
type Profile = Database['public']['Tables']['profiles']['Row'];
type AppRole = Profile['role'];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string, role: AppRole, municipality_id?: string, school_id?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  fetchProfile: (userId: string) => Promise<void>;
  activeMunicipalityIdForSuperAdmin: string | null;
  setActiveMunicipalityIdForSuperAdmin: (id: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMunicipalityIdForSuperAdmin, setActiveMunicipalityIdForSuperAdmin] = useState<string | null>(null);

  const fetchUserProfileAndRole = async (userId: string) => {
    console.log("AuthContext: Fetching user profile for:", userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error("AuthContext: Error fetching profile:", error);
        setProfile(null);
        setRole(null);
        throw error; // Propagate error
      }

      if (data) {
        setProfile(data);
        setRole(data.role);
        console.log("AuthContext: Profile data received:", data);
        console.log("AuthContext: Profile and role set:", data.role);
      } else {
        setProfile(null);
        setRole(null);
        console.log("AuthContext: No profile found for user.");
      }
    } catch (error) {
      console.error("AuthContext: Caught error in fetchUserProfileAndRole:", error);
      setProfile(null);
      setRole(null);
    }
  };

  useEffect(() => {
    const loadInitialSession = async () => {
      console.log("AuthContext: Loading initial session...");
      setLoading(true); // Ensure loading is true at the start
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          console.log("AuthContext: Initial session found:", session.user.id);
          setUser(session.user);
          setSession(session);
          await fetchUserProfileAndRole(session.user.id);
        } else {
          console.log("AuthContext: No initial session.");
          setUser(null);
          setSession(null);
          setProfile(null);
          setRole(null);
        }
      } catch (error) {
        console.error("AuthContext: Error during initial session load or profile fetch:", error);
        setUser(null);
        setSession(null);
        setProfile(null);
        setRole(null);
      } finally {
        setLoading(false); // Ensure loading is false after initial session check
        console.log("AuthContext: Initial session load finished. Final state: user=", !!user, "profile=", !!profile, "role=", role, "loading=", false);
      }
    };

    loadInitialSession();

    console.log("AuthContext: Setting up auth state listener...");
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("AuthContext: onAuthStateChange event:", event);
        setLoading(true); // Set loading true at the start of state change processing

        try {
          if (session?.user) {
            setUser(session.user);
            setSession(session);
            await fetchUserProfileAndRole(session.user.id);
          } else {
            setUser(null);
            setSession(null);
            setProfile(null);
            setRole(null);
            setActiveMunicipalityIdForSuperAdmin(null);
          }
        } catch (error) {
          console.error("AuthContext: Error during onAuthStateChange profile fetch:", error);
          setUser(null);
          setSession(null);
          setProfile(null);
          setRole(null);
          setActiveMunicipalityIdForSuperAdmin(null);
        } finally {
          setLoading(false); // Ensure loading is false after state change processing
          console.log("AuthContext: onAuthStateChange finished. Final state: user=", !!user, "profile=", !!profile, "role=", role, "loading=", false);
        }
      }
    );

    return () => {
      console.log('AuthContext: Unsubscribing...');
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { error };
      }
      if (data.user) {
        await fetchUserProfileAndRole(data.user.id);
      }
      return { error: null };
    } catch (error: any) {
      console.error("AuthContext: Error during signIn:", error);
      return { error: error instanceof Error ? error : new Error("Erro desconhecido durante o login.") };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string, role: AppRole, municipality_id?: string, school_id?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role, municipality_id, school_id },
        },
      });

      if (error) {
        return { error };
      }

      if (data.user) {
        await fetchUserProfileAndRole(data.user.id);
      }
      return { error: null };
    } catch (error: any) {
      console.error("AuthContext: Error during signUp:", error);
      return { error: error instanceof Error ? error : new Error("Erro desconhecido durante o cadastro.") };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    console.log("AuthContext: Attempting to sign out...");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("AuthContext: Error during sign out:", error);
      } else {
        console.log("AuthContext: Sign out successful.");
      }
      return { error };
    } catch (error: any) {
      console.error("AuthContext: Error during signOut:", error);
      return { error: error instanceof Error ? error : new Error("Erro desconhecido durante o logout.") };
    } finally {
      setLoading(false);
    }
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
    fetchProfile: fetchUserProfileAndRole,
    activeMunicipalityIdForSuperAdmin,
    setActiveMunicipalityIdForSuperAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};