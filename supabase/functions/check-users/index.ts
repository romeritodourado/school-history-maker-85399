// Importando os módulos necessários
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { jwtVerify } from 'https://esm.sh/jose@5.6.3';

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
    console.log('Edge Function check-users: Requisição recebida.');

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
    console.log('Edge Function: Token JWT recebido (parcial):', token.substring(0, 10) + '...');

    // Get JWT secret from environment variables
    const jwtSecret = Deno.env.get('JWT_SECRET');
    if (!jwtSecret) {
      console.error('Edge Function: JWT_SECRET não configurada nas variáveis de ambiente da função.');
      return new Response(JSON.stringify({ message: 'JWT_SECRET não configurada.' }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    let user;
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret));
      user = payload;
      console.log('Edge Function: Token JWT verificado com sucesso. Payload do usuário:', user.sub);
    } catch (jwtError) {
      console.error('Edge Function: Erro ao verificar token JWT:', jwtError);
      return new Response(JSON.stringify({ message: 'Não autorizado: Token inválido ou expirado.' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

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
      .eq('user_id', user.sub) // Use user.sub (subject) as the user ID from the JWT payload
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

    // Check if user has permission to view users
    if (authenticatedUserRole !== 'superadmin' && authenticatedUserRole !== 'adminrede' && authenticatedUserRole !== 'diretor') {
      console.log('Edge Function: Usuário não tem permissão para visualizar usuários.');
      return new Response(JSON.stringify({ message: 'Permissão negada: Você não tem autorização para visualizar usuários.' }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    // Fetch all users with their profiles and roles
    const { data: usersData, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select(`
        id,
        full_name,
        schools:school_id (name),
        user_roles(role)
      `)
      .order('full_name');

    if (usersError) {
      console.error('Edge Function: Erro ao buscar usuários:', usersError.message);
      throw usersError;
    }

    console.log('Edge Function: Usuários encontrados:', usersData.length);
    
    // Filter users by name "Romerito Dourado"
    const romeritoUsers = usersData.filter(user => 
      user.full_name && user.full_name.includes('Romerito') && user.full_name.includes('Dourado')
    );
    
    console.log('Edge Function: Usuários com nome "Romerito Dourado":', romeritoUsers.length);

    return new Response(JSON.stringify({ 
      success: true, 
      users: usersData,
      romeritoUsers: romeritoUsers,
      authenticatedUser: user.sub,
      authenticatedUserRole: authenticatedUserRole
    }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('Edge Function: Erro inesperado na função check-users:', error);
    return new Response(JSON.stringify({ message: error.message || 'Erro interno do servidor.' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});