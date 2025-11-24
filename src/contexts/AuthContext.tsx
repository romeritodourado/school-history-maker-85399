import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { loginSchema, signupSchema } from '@/lib/validationSchemas'; // Assuming these schemas will be created

type AppRole = 'super_admin' | 'municipal_admin' | 'school_admin' | 'secretary' | 'teacher';

interface Profile {
  id: string;
  email: string | null;
  name: string | null;
  municipality_id: string | null;
  school_id: string | null;
  role: AppRole;
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
  const navigate = useNavigate();

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setRole(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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
          data: { name, role, municipality_id: municipalityId, school_id: schoolId },
        },
      });

      if (error) return { error };

      // The handle_new_user trigger will create the profile with the default 'teacher' role.
      // We need to update it to the specified role and link municipality/school if provided.
      if (data.user) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role, municipality_id: municipalityId, school_id: schoolId, name, email })
          .eq('id', data.user.id);
        
        if (updateError) return { error: updateError as unknown as Error };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
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