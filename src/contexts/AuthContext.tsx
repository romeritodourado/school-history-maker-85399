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
        throw error;
      }

      if (data) {
        setProfile(data);
        setRole(data.role);
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
        setProfile(null); // Ensure profile is cleared
        setRole(null);   // Ensure role is cleared
      }
      setLoading(false); // Ensure loading is false after initial session check
    };

    loadInitialSession();

    console.log("AuthContext: Setting up auth state listener...");
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("AuthContext: onAuthStateChange event:", event);
        setLoading(true); // Set loading true at the start of state change processing

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
        setLoading(false); // Ensure loading is false after state change processing
      }
    );

    return () => {
      console.log('AuthContext: Unsubscribing...');
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      return { error };
    }
    if (data.user) {
      await fetchUserProfileAndRole(data.user.id);
    }
    setLoading(false);
    return { error: null };
  };

  const signUp = async (email: string, password: string, name: string, role: AppRole, municipality_id?: string, school_id?: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role, municipality_id, school_id },
      },
    });

    if (error) {
      setLoading(false);
      return { error };
    }

    if (data.user) {
      // The handle_new_user_profile trigger should create the profile,
      // but we might need to explicitly update it if the trigger doesn't set all fields
      // or if we want to ensure consistency immediately.
      // For now, rely on the trigger and then fetch the profile.
      await fetchUserProfileAndRole(data.user.id);
    }
    setLoading(false);
    return { error: null };
  };

  const signOut = async () => {
    console.log("AuthContext: Attempting to sign out...");
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("AuthContext: Error during sign out:", error);
    } else {
      console.log("AuthContext: Sign out successful.");
    }
    setLoading(false);
    return { error };
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