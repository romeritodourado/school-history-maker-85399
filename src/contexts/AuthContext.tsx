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
  const [loading, setLoading] = useState(true); // Start as true
  const [activeMunicipalityIdForSuperAdmin, setActiveMunicipalityIdForSuperAdmin] = useState<string | null>(null);

  const fetchUserProfileAndRole = async (userId: string) => {
    console.log("AuthContext: Fetching user profile for:", userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      console.log("AuthContext: Supabase profile query result - data:", data, "error:", error); // ADDED LOG

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
    console.log("AuthContext: Setting up auth state listener...");
    // Set loading to true initially, it will be set to false after the first onAuthStateChange event
    setLoading(true); 

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("AuthContext: onAuthStateChange event:", event);
        // For every state change, we are processing, so set loading to true
        // This ensures components waiting for auth are aware of ongoing changes
        setLoading(true); 

        let currentUser: User | null = null;
        let currentSession: Session | null = null;
        let currentProfile: Profile | null = null;
        let currentRole: AppRole | null = null;

        try {
          if (session?.user) {
            currentUser = session.user;
            currentSession = session;
            setUser(session.user);
            setSession(session);
            await fetchUserProfileAndRole(session.user.id);
            // After fetchUserProfileAndRole, profile and role states are updated.
            // We need to read them directly for the final log.
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            if (profileData) {
              currentProfile = profileData;
              currentRole = profileData.role;
            }
          } else {
            setUser(null);
            setSession(null);
            setProfile(null);
            setRole(null);
            setActiveMunicipalityIdForSuperAdmin(null);
          }
        } catch (error) {
          console.error("AuthContext: Error during onAuthStateChange profile fetch:", error);
          // Ensure state is cleared on error
          setUser(null);
          setSession(null);
          setProfile(null);
          setRole(null);
          setActiveMunicipalityIdForSuperAdmin(null);
        } finally {
          // Always set loading to false after processing the event
          setLoading(false); 
          console.log("AuthContext: onAuthStateChange finished. Final state: user=", !!currentUser, "profile=", !!currentProfile, "role=", currentRole, "loading=", false);
        }
      }
    );

    return () => {
      console.log('AuthContext: Unsubscribing...');
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array means this runs once on mount

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setLoading(false); // Set loading to false on immediate error
        return { error };
      }
      // onAuthStateChange will handle setting user, session, profile, role, and loading=false
      return { error: null };
    } catch (error: any) {
      console.error("AuthContext: Error during signIn:", error);
      setLoading(false); // Ensure loading is false on unexpected error
      return { error: error instanceof Error ? error : new Error("Erro desconhecido durante o login.") };
    }
  };

  const signUp = async (email: string, password: string, name: string, role: AppRole, municipality_id?: string, school_id?: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role, municipality_id, school_id },
        },
      });

      if (error) {
        setLoading(false); // Set loading to false on immediate error
        return { error };
      }
      // onAuthStateChange will handle setting user, session, profile, role, and loading=false
      return { error: null };
    } catch (error: any) {
      console.error("AuthContext: Error during signUp:", error);
      setLoading(false); // Ensure loading is false on unexpected error
      return { error: error instanceof Error ? error : new Error("Erro desconhecido durante o cadastro.") };
    }
  };

  const signOut = async () => {
    console.log("AuthContext: Attempting to sign out...");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("AuthContext: Error during sign out:", error);
        setLoading(false); // Set loading to false on immediate error
      }
      // onAuthStateChange will handle clearing state and setting loading=false
      return { error };
    } catch (error: any) {
      console.error("AuthContext: Error during signOut:", error);
      setLoading(false); // Ensure loading is false on unexpected error
      return { error: error instanceof Error ? error : new Error("Erro desconhecido durante o logout.") };
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