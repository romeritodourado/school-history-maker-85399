import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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

  // Use refs to get the latest state values in console.log
  const userRef = useRef(user);
  const profileRef = useRef(profile);
  const roleRef = useRef(role);

  useEffect(() => {
    userRef.current = user;
    profileRef.current = profile;
    roleRef.current = role;
  }, [user, profile, role]);

  const fetchUserProfileAndRole = async (userId: string) => {
    console.log("AuthContext: Fetching user profile for:", userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      console.log("AuthContext: Supabase profile query result - data:", data, "error:", error);
      if (data) {
        console.log("AuthContext: DEBUG: role from fetched data =", data.role); // Explicit log for role
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
    setLoading(true); 

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("AuthContext: onAuthStateChange event:", event);
        setLoading(true); 

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
          setLoading(false); 
          console.log("AuthContext: onAuthStateChange finished. Final state: user=", !!userRef.current, "profile=", !!profileRef.current, "role=", roleRef.current, "loading=", false);
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
        setLoading(false);
        return { error };
      }
      return { error: null };
    } catch (error: any) {
      console.error("AuthContext: Error during signIn:", error);
      setLoading(false);
      return { error: error instanceof Error ? error : new Error("Erro desconhecido durante o login.") };
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
        setLoading(false);
        return { error };
      }
      return { error: null };
    } catch (error: any) {
      console.error("AuthContext: Error during signUp:", error);
      setLoading(false);
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
        setLoading(false);
      }
      return { error };
    } catch (error: any) {
      console.error("AuthContext: Error during signOut:", error);
      setLoading(false);
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