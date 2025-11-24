import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { loginSchema, signupSchema } from '@/lib/validationSchemas';

type AppRole = 'super_admin' | 'municipal_admin' | 'school_admin' | 'secretary' | 'teacher';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

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
    console.log('AuthContext: Initializing...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthContext: onAuthStateChange event:', event);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('AuthContext: User found, fetching profile...');
          try {
            await fetchProfile(session.user.id);
            console.log('AuthContext: Profile fetched.');
          } catch (profileError) {
            console.error('AuthContext: Error fetching profile in onAuthStateChange:', profileError);
            setProfile(null);
            setRole(null);
          }
        } else {
          console.log('AuthContext: No user in session.');
          setProfile(null);
          setRole(null);
        }
        setLoading(false);
        console.log('AuthContext: Loading set to false after onAuthStateChange.');
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('AuthContext: getSession resolved.');
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        console.log('AuthContext: User found in getSession, fetching profile...');
        try {
          await fetchProfile(session.user.id);
          console.log('AuthContext: Profile fetched after getSession.');
        } catch (profileError) {
          console.error('AuthContext: Error fetching profile in getSession:', profileError);
          setProfile(null);
          setRole(null);
        }
      }
      setLoading(false);
      console.log('AuthContext: Loading set to false after getSession.');
    }).catch(error => {
      console.error('AuthContext: getSession failed:', error);
      setLoading(false);
    });

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
        options: {
          data: {
            name,
            role,
            municipality_id: municipalityId,
            school_id: schoolId,
          },
        },
      });

      if (error) return { error };

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
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