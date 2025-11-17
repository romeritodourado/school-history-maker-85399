import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client for the authenticated user (with anon key)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Get the authenticated user from the JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ message: 'Não autorizado: Token de autenticação ausente.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userAuthError } = await supabaseClient.auth.getUser(token);

    if (userAuthError || !user) {
      console.error('Erro ao autenticar usuário na Edge Function:', userAuthError?.message);
      return new Response(JSON.stringify({ message: 'Não autorizado: Token inválido ou expirado.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase Admin client using the service role key (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch the role of the authenticated user
    const { data: authUserRoleData, error: authUserRoleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (authUserRoleError || !authUserRoleData) {
      console.error('Erro ao buscar cargo do usuário autenticado:', authUserRoleError?.message);
      return new Response(JSON.stringify({ message: 'Permissão negada: Cargo do usuário autenticado não encontrado.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const authenticatedUserRole = authUserRoleData.role;

    // Parse request body
    const { user_id: targetUserId } = await req.json();

    if (!targetUserId) {
      return new Response(JSON.stringify({ message: 'ID do usuário a ser excluído é obrigatório.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prevent user from deleting themselves
    if (user.id === targetUserId) {
      return new Response(JSON.stringify({ message: 'Você não pode excluir seu próprio usuário.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the role and school_id of the target user
    const { data: targetUserProfileData, error: targetUserProfileError } = await supabaseAdmin
      .from('profiles')
      .select(`
        id,
        school_id,
        user_roles(role)
      `)
      .eq('id', targetUserId)
      .single();

    if (targetUserProfileError && targetUserProfileError.code !== 'PGRST116') {
      console.error('Erro ao buscar perfil do usuário alvo:', targetUserProfileError?.message);
      throw targetUserProfileError;
    }

    const targetUserRole = (targetUserProfileData?.user_roles as any)?.[0]?.role; // user_roles is an array due to join
    const targetUserSchoolId = targetUserProfileData?.school_id;

    // Fetch the school_id of the authenticated user if they are a 'diretor'
    let authenticatedUserSchoolId: string | null = null;
    if (authenticatedUserRole === 'diretor') {
      const { data: authUserProfileData, error: authUserProfileError } = await supabaseAdmin
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .single();
      if (authUserProfileError) {
        console.error('Erro ao buscar school_id do diretor autenticado:', authUserProfileError?.message);
        throw authUserProfileError;
      }
      authenticatedUserSchoolId = authUserProfileData?.school_id;
    }

    // Permission check logic (mirroring RLS for DELETE on profiles/user_roles)
    let canDelete = false;
    if (authenticatedUserRole === 'superadmin') {
      canDelete = true;
    } else if (authenticatedUserRole === 'adminrede') {
      if (targetUserRole !== 'superadmin') { // Adminrede cannot delete superadmin
        canDelete = true;
      }
    } else if (authenticatedUserRole === 'diretor') {
      if (
        ['secretario', 'assistente'].includes(targetUserRole || '') &&
        authenticatedUserSchoolId &&
        targetUserSchoolId &&
        authenticatedUserSchoolId === targetUserSchoolId
      ) {
        canDelete = true;
      }
    }

    if (!canDelete) {
      return new Response(JSON.stringify({ message: 'Permissão negada: Você não tem autorização para excluir este usuário.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Perform the deletion
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

    if (deleteError) {
      console.error('Erro ao excluir usuário via Supabase Admin:', deleteError?.message);
      return new Response(JSON.stringify({ message: deleteError.message || 'Erro ao excluir usuário.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: 'Usuário excluído com sucesso.' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro inesperado na função Edge delete-user:', error);
    return new Response(JSON.stringify({ message: error.message || 'Erro interno do servidor.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});