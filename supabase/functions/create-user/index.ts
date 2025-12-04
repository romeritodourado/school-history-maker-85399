import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client for the current user (the one making the request)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { 'Authorization': req.headers.get('Authorization')! } },
      }
    );

    // Get the user from the request (the one trying to create another user)
    const { data: { user: currentUser }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !currentUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized: No active user session.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Fetch the current user's profile to check their role and scope
    const { data: currentProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role, municipality_id, school_id')
      .eq('id', currentUser.id)
      .single();

    if (profileError || !currentProfile) {
      return new Response(JSON.stringify({ error: 'Unauthorized: User profile not found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    const { email, password, name, role, municipality_id, school_id } = await req.json();

    // Role-based access control for creating users
    let isAllowed = false;
    if (currentProfile.role === 'super_admin') {
      isAllowed = true; // Super admin can create any user
    } else if (currentProfile.role === 'municipal_secretary' || currentProfile.role === 'network_manager') {
      // Municipal roles can create users within their municipality, but not super_admin
      if (role !== 'super_admin' && municipality_id === currentProfile.municipality_id) {
        isAllowed = true;
      }
    } else if (currentProfile.role === 'school_admin') {
      // School admin can create secretary within their school
      if (role === 'secretary' && school_id === currentProfile.school_id) {
        isAllowed = true;
      }
    }

    if (!isAllowed) {
      return new Response(JSON.stringify({ error: 'Forbidden: User not allowed to create this type of user or in this scope.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Create a Supabase client with the service_role key (only available in Edge Functions)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Automatically confirm email
      user_metadata: {
        name,
        role,
        municipality_id: municipality_id || null,
        school_id: school_id || null,
      },
    });

    if (createUserError) {
      console.error('Error creating user:', createUserError);
      return new Response(JSON.stringify({ error: createUserError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    return new Response(JSON.stringify({ message: 'User created successfully', userId: newUser.user?.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Edge Function error:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});