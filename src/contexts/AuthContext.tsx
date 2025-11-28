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

  // Initialize auth state
  useEffect(() => {
    console.log("AuthProvider: Initializing auth state");
    
    const initializeAuth = async () => {
      try {
        // Get current session
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("AuthProvider: Error getting session:", error);
          setUser(null);
          setSession(null);
          setProfile(null);
          setRole(null);
        } else if (initialSession?.user) {
          console.log("AuthProvider: Session found, setting user");
          setUser(initialSession.user);
          setSession(initialSession);
          
          // Fetch user profile
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', initialSession.user.id)
              .single();

            if (profileError) {
              console.error("AuthProvider: Error fetching profile:", profileError);
              setProfile(null);
              setRole(null);
            } else {
              console.log("AuthProvider: Profile fetched:", profileData);
              setProfile(profileData);
              setRole(profileData.role);
            }
          } catch (profileFetchError) {
            console.error("AuthProvider: Exception fetching profile:", profileFetchError);
            setProfile(null);
            setRole(null);
          }
        } else {
          console.log("AuthProvider: No session found");
          setUser(null);
          setSession(null);
          setProfile(null);
          setRole(null);
        }
      } catch (error) {
        console.error("AuthProvider: Error in initializeAuth:", error);
        setUser(null);
        setSession(null);
        setProfile(null);
        setRole(null);
      } finally {
        console.log("AuthProvider: Finished initializing auth state");
        setLoading(false);
      }
    };

    initializeAuth();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`AuthProvider: Auth state changed - ${event}`);
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log("AuthProvider: User signed in");
          setUser(session.user);
          setSession(session);
          
          // Fetch user profile
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profileError) {
              console.error("AuthProvider: Error fetching profile:", profileError);
              setProfile(null);
              setRole(null);
            } else {
              console.log("AuthProvider: Profile fetched:", profileData);
              setProfile(profileData);
              setRole(profileData.role);
            }
          } catch (profileFetchError) {
            console.error("AuthProvider: Exception fetching profile:", profileFetchError);
            setProfile(null);
            setRole(null);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log("AuthProvider: User signed out");
          setUser(null);
          setSession(null);
          setProfile(null);
          setRole(null);
          setActiveMunicipalityIdForSuperAdmin(null);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log("AuthProvider: Token refreshed");
          setUser(session.user);
          setSession(session);
        } else if (event === 'USER_UPDATED' && session?.user) {
          console.log("AuthProvider: User updated");
          setUser(session.user);
          setSession(session);
        }
        
        // Garantir que loading seja false após qualquer mudança de estado
        if (loading) {
          console.log("AuthProvider: Setting loading to false after auth state change");
          setLoading(false);
        }
      }
    );

    return () => {
      console.log("AuthProvider: Cleaning up auth listener");
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log(`AuthProvider: Signing in user ${email}`);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error("AuthProvider: Sign in error:", error);
        return { error };
      }
      console.log("AuthProvider: Sign in successful");
      return { error: null };
    } catch (error: any) {
      console.error("AuthProvider: Sign in exception:", error);
      return { error: error instanceof Error ? error : new Error("Unknown error during sign in") };
    }
  };

  const signUp = async (email: string, password: string, name: string, role: AppRole, municipality_id?: string, school_id?: string) => {
    console.log(`AuthProvider: Signing up user ${email}`);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role, municipality_id, school_id },
        },
      });

      if (error) {
        console.error("AuthProvider: Sign up error:", error);
        return { error };
      }
      console.log("AuthProvider: Sign up successful");
      return { error: null };
    } catch (error: any) {
      console.error("AuthProvider: Sign up exception:", error);
      return { error: error instanceof Error ? error : new Error("Unknown error during sign up") };
    }
  };

  const signOut = async () => {
    console.log("AuthProvider: Signing out user");
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("AuthProvider: Sign out error:", error);
        return { error };
      }
      console.log("AuthProvider: Sign out successful");
      return { error: null };
    } catch (error: any) {
      console.error("AuthProvider: Sign out exception:", error);
      return { error: error instanceof Error ? error : new Error("Unknown error during sign out") };
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