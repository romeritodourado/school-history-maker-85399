import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { loginSchema, signupSchema } from '@/lib/validationSchemas';

type AppRole = 'super_admin' | 'municipal_secretary' | 'network_manager' | 'school_admin' | 'secretary' | 'teacher';

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
  const [loading, setLoading] = useState(true);
  const [activeMunicipalityIdForSuperAdmin, setActiveMunicipalityIdForSuperAdmin] = useState<string | null>(null);

  const fetchUserProfileAndRole = async (userId: string) => {
    console.log("AuthContext: Fetching profile for userId:", userId);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, name, municipality_id, school_id, role, created_at, updated_at')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('AuthContext: Profile fetch error:', profileError);
        setProfile(null);
        setRole(null);
        throw profileError;
      }
      console.log("AuthContext: Profile fetched:", JSON.stringify(profileData));
      setProfile(profileData as Profile);
      setRole(profileData.role as AppRole);
      console.log("AuthContext: Role loaded:", profileData.role);
    } catch (error) {
      console.error('AuthContext: Error in fetchUserProfileAndRole:', error);
      setProfile(null);
      setRole(null);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const handleAuthStateChange = async (event: string, session: Session | null) => {
      console.log("AuthContext: onAuthStateChange event:", event, "Session:", session);
      if (!isMounted) return;

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
      setLoading(false); // Ensure loading is false after any auth state change
      console.log(`AuthContext: Event ${event} processed. Loading set to false.`);
    };

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      if (session?.user) {
        setUser(session.user);
        setSession(session);
        await fetchUserProfileAndRole(session.user.id);
      }
      setLoading(false); // Set loading to false after initial check
      console.log('AuthContext: Initial session check complete. Loading set to false.');
    });

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    return () => {
      isMounted = false;
      console.log('AuthContext: Unsubscribing from auth state changes.');
      subscription.unsubscribe();
    };
  }, []);

  // Listener em tempo real para mudanças no perfil (separado do carregamento inicial)
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
          console.log('AuthContext: Real-time profile updated:', payload);
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
            name: name,
          }
        }
      });

      if (error) return { error };

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            email: data.user.email,
            name: name,
            role: role,
            municipality_id: municipalityId || null,
            school_id: schoolId || null,
          })
          .eq('id', data.user.id);

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
    fetchProfile: fetchUserProfileAndRole,
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