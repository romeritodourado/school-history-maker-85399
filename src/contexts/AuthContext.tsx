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

  const supabaseAuthTokenKey = `sb-${supabase.supabaseUrl.split('.')[0].split('-').pop()}-auth-token`;

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
        console.log('AuthContext: onAuthStateChange event:', event, 'Session:', session);
        
        setLoading(true);

        setSession(session);
        setUser(session?.user ?? null);
        setProfile(null);
        setRole(null);
        setActiveMunicipalityIdForSuperAdmin(null);

        try {
          if (session?.user) {
            console.log('AuthContext: User found, fetching profile...');
            await fetchProfile(session.user.id);
            console.log('AuthContext: Profile fetched.');
            console.log('AuthContext: localStorage after SIGNED_IN:', localStorage.getItem(supabaseAuthTokenKey));
          } else {
            console.log('AuthContext: No user in session.');
            console.log('AuthContext: localStorage after SIGNED_OUT/no user:', localStorage.getItem(supabaseAuthTokenKey));
          }
        } catch (error) {
          console.error('AuthContext: Error during auth state change processing:', error);
          setProfile(null);
          setRole(null);
          setActiveMunicipalityIdForSuperAdmin(null);
        } finally {
          setLoading(false); 
          console.log('AuthContext: Loading set to false after onAuthStateChange processing.');
        }
      }
    );

    const checkInitialSession = async () => {
      setLoading(true);
      console.log('AuthContext: Checking initial session...');
      console.log('AuthContext: localStorage before initial check:', localStorage.getItem(supabaseAuthTokenKey));
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      
      try {
        if (session?.user) {
          console.log('AuthContext: Initial session found, fetching profile...');
          await fetchProfile(session.user.id);
          console.log('AuthContext: Initial profile fetched.');
          console.log('AuthContext: localStorage after initial session found:', localStorage.getItem(supabaseAuthTokenKey));
        } else {
          console.log('AuthContext: No initial session found.');
          console.log('AuthContext: localStorage after no initial session:', localStorage.getItem(supabaseAuthTokenKey));
        }
      } catch (error) {
        console.error('AuthContext: Error during initial session check:', error);
        setProfile(null);
        setRole(null);
        setActiveMunicipalityIdForSuperAdmin(null);
      } finally {
        setLoading(false);
        console.log('AuthContext: Initial session check complete, loading set to false.');
      }
    };

    checkInitialSession();

    return () => {
      console.log('AuthContext: Unsubscribing from auth state changes.');
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;

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