import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  const [loading, setLoading] = useState(true); // Start as true
  const [activeMunicipalityIdForSuperAdmin, setActiveMunicipalityIdForSuperAdmin] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchUserProfileAndRole = useCallback(async (userId: string) => {
    console.log(`AuthContext: Fetching user profile for: ${userId}`);
    setProfileLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') { // No rows found
        console.log("AuthContext: No profile found for user");
        setProfile(null);
        setRole(null);
      } else if (error) {
        console.error("AuthContext: Error fetching profile:", error);
        setProfile(null);
        setRole(null);
      } else if (data) {
        console.log("AuthContext: Profile fetched successfully:", data);
        setProfile(data);
        setRole(data.role);
      } else {
        console.log("AuthContext: No profile data returned");
        setProfile(null);
        setRole(null);
      }
    } catch (error) {
      console.error("AuthContext: Error caught in fetchUserProfileAndRole:", error);
      setProfile(null);
      setRole(null);
    } finally {
      setProfileLoading(false);
      console.log("AuthContext: Finished fetching profile");
    }
  }, []);

  useEffect(() => {
    console.log("AuthContext: Setting up initial session loading...");
    const initializeAuth = async () => {
      setLoading(true);
      try {
        console.log("AuthContext: Getting session from Supabase...");
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("AuthContext: Error getting initial session:", error);
          setUser(null);
          setSession(null);
          setProfile(null);
          setRole(null);
          setActiveMunicipalityIdForSuperAdmin(null);
        } else if (initialSession?.user) {
          console.log("AuthContext: Session found, setting user and fetching profile...");
          setUser(initialSession.user);
          setSession(initialSession);
          await fetchUserProfileAndRole(initialSession.user.id);
        } else {
          console.log("AuthContext: No session found");
          setUser(null);
          setSession(null);
          setProfile(null);
          setRole(null);
          setActiveMunicipalityIdForSuperAdmin(null);
        }
      } catch (error) {
        console.error("AuthContext: Error during initial session loading:", error);
        setUser(null);
        setSession(null);
        setProfile(null);
        setRole(null);
        setActiveMunicipalityIdForSuperAdmin(null);
      } finally {
        setLoading(false);
        console.log("AuthContext: Initial session loading complete");
      }
    };

    initializeAuth();

    console.log("AuthContext: Setting up auth state listener...");
    // Listener para mudanças de estado de autenticação subsequentes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`AuthContext: onAuthStateChange event: ${event}`);
        // Apenas reage a mudanças significativas que não sejam a inicialização
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (session?.user) {
            console.log("AuthContext: User signed in, setting session and fetching profile...");
            setUser(session.user);
            setSession(session);
            await fetchUserProfileAndRole(session.user.id);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log("AuthContext: User signed out, resetting state...");
          setUser(null);
          setSession(null);
          setProfile(null);
          setRole(null);
          setActiveMunicipalityIdForSuperAdmin(null);
        }
        // Outros eventos como PASSWORD_RECOVERY não exigem alteração do estado de user/profile
      }
    );

    return () => {
      console.log("AuthContext: Unsubscribing from auth state listener...");
      subscription.unsubscribe();
    };
  }, [fetchUserProfileAndRole]);

  const signIn = async (email: string, password: string) => {
    console.log(`AuthContext: Attempting to sign in user: ${email}`);
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error("AuthContext: Error during signIn:", error);
        setLoading(false);
        return { error };
      }
      console.log("AuthContext: Sign in successful");
      // onAuthStateChange vai lidar com a definição de user, session, profile, role e loading para false
      return { error: null };
    } catch (error: any) {
      console.error("AuthContext: Error caught during signIn:", error);
      setLoading(false);
      return { error: error instanceof Error ? error : new Error("Erro desconhecido durante o login.") };
    }
  };

  const signUp = async (email: string, password: string, name: string, role: AppRole, municipality_id?: string, school_id?: string) => {
    console.log(`AuthContext: Attempting to sign up user: ${email}`);
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
        console.error("AuthContext: Error during signUp:", error);
        setLoading(false);
        return { error };
      }
      console.log("AuthContext: Sign up successful");
      // onAuthStateChange vai lidar com a definição de user, session, profile, role e loading para false
      return { error: null };
    } catch (error: any) {
      console.error("AuthContext: Error caught during signUp:", error);
      setLoading(false);
      return { error: error instanceof Error ? error : new Error("Erro desconhecido durante o cadastro.") };
    }
  };

  const signOut = async () => {
    console.log("AuthContext: Attempting to sign out user");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("AuthContext: Error during signOut:", error);
        setLoading(false);
      }
      console.log("AuthContext: Sign out successful");
      // onAuthStateChange vai lidar com o reset de user, session, profile, role e loading para false
      return { error };
    } catch (error: any) {
      console.error("AuthContext: Error caught during signOut:", error);
      setLoading(false);
      return { error: error instanceof Error ? error : new Error("Erro desconhecido durante o logout.") };
    }
  };

  const value = {
    user,
    session,
    profile,
    role,
    loading: loading || profileLoading,
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