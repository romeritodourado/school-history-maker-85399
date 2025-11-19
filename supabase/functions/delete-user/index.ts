import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

Deno.serve(async (req) => {
  // Handle CORS OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Edge Function delete-user: Requisição recebida.');

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
      console.log('Edge Function: Auth header ausente.');
      return new Response(JSON.stringify({ message: 'Não autorizado: Token de autenticação ausente.' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Edge Function: Token JWT recebido (parcial):', token.substring(0, 10) + '...'); // Log parcial do token
    const { data: { user }, error: userAuthError } = await supabaseClient.auth.getUser(token);

    if (userAuthError || !user) {
      console.error('Edge Function: Erro ao autenticar usuário com JWT:', userAuthError?.message || 'Usuário não encontrado.');
      return new Response(JSON.stringify({ message: 'Não autorizado: Token inválido ou expirado.' }), {
        status: 401,
        headers: corsHeaders,
      });
    }
    console.log('Edge Function: Usuário autenticado com sucesso:', user.id, user.email);

    // Create Supabase Admin client using the service role key (bypasses RLS)
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) {
      console.error('Edge Function: SUPABASE_SERVICE_ROLE_KEY não configurada nas variáveis de ambiente da função.');
      return new Response(JSON.stringify({ message: 'SERVICE_ROLE_KEY não configurada.' }), {
        status: 500,
        headers: corsHeaders,
      });
    }
    console.log('Edge Function: SUPABASE_SERVICE_ROLE_KEY lida com sucesso.');
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceKey
    );

    // Fetch the role of the authenticated user
    const { data: authUserRoleData, error: authUserRoleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (authUserRoleError || !authUserRoleData) {
      console.error('Edge Function: Erro ao buscar cargo do usuário autenticado:', authUserRoleError?.message);
      return new Response(JSON.stringify({ message: 'Permissão negada: Cargo do usuário autenticado não encontrado.' }), {
        status: 403,
        headers: corsHeaders,
      });
    }
    const authenticatedUserRole = authUserRoleData.role;
    console.log('Edge Function: Cargo do usuário autenticado:', authenticatedUserRole);

    // Parse request body
    const { user_id: targetUserId } = await req.json();
    console.log('Edge Function: ID do usuário alvo para exclusão:', targetUserId);

    if (!targetUserId) {
      console.log('Edge Function: user_id alvo ausente no body.');
      return new Response(JSON.stringify({ message: 'ID do usuário a ser excluído é obrigatório.' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Prevent user from deleting themselves
    if (user.id === targetUserId) {
      console.log('Edge Function: Tentativa de auto-exclusão bloqueada.');
      return new Response(JSON.stringify({ message: 'Você não pode excluir seu próprio usuário.' }), {
        status: 403,
        headers: corsHeaders,
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
      console.error('Edge Function: Erro ao buscar perfil do usuário alvo:', targetUserProfileError?.message);
      throw targetUserProfileError;
    }

    const targetUserRole = (targetUserProfileData?.user_roles as any)?.[0]?.role;
    const targetUserSchoolId = targetUserProfileData?.school_id;
    console.log('Edge Function: Cargo do usuário alvo:', targetUserRole, 'School ID:', targetUserSchoolId);

    // Fetch the school_id of the authenticated user if they are a 'diretor'
    let authenticatedUserSchoolId: string | null = null;
    if (authenticatedUserRole === 'diretor') {
      const { data: authUserProfileData, error: authUserProfileError } = await supabaseAdmin
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .single();
      if (authUserProfileError) {
        console.error('Edge Function: Erro ao buscar school_id do diretor autenticado:', authUserProfileError?.message);
        throw authUserProfileError;
      }
      authenticatedUserSchoolId = authUserProfileData?.school_id;
      console.log('Edge Function: School ID do diretor autenticado:', authenticatedUserSchoolId);
    }

    // Permission check logic (mirroring RLS for DELETE on profiles/user_roles)
    let canDelete = false;
    if (authenticatedUserRole === 'superadmin') {
      canDelete = true;
    } else if (authenticatedUserRole === 'adminrede') {
      if (targetUserRole !== 'superadmin') {
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
    console.log('Edge Function: Permissão para deletar:', canDelete);

    if (!canDelete) {
      return new Response(JSON.stringify({ message: 'Permissão negada: Você não tem autorização para excluir este usuário.' }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    // Perform the deletion using the Admin API endpoint
    const response = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/auth/v1/admin/users/${targetUserId}`,
      {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Edge Function: Erro ao excluir usuário via Supabase Admin API:', errorData);
      return new Response(JSON.stringify({ message: errorData.message || 'Erro ao excluir usuário.' }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    console.log('Edge Function: Usuário excluído com sucesso:', targetUserId);
    return new Response(JSON.stringify({ success: true, message: 'Usuário excluído com sucesso.' }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('Edge Function: Erro inesperado na função delete-user:', error);
    return new Response(JSON.stringify({ message: error.message || 'Erro interno do servidor.' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});