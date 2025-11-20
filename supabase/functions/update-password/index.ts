// Importando os módulos necessários
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { jwtVerify } from 'https://esm.sh/jose@5.6.3';

// Cabeçalhos CORS para permitir requisições cross-origin
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

// Função principal que será executada quando a edge function for chamada
Deno.serve(async (req) => {
  // Trata a requisição OPTIONS para CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Edge Function update-password: Requisição recebida.');

    // Obtém o token JWT do cabeçalho de autorização
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

    // Obtém o segredo JWT das variáveis de ambiente
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
      // Verifica e decodifica o token JWT
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

    // Cria um cliente Supabase com a service role key (ignora RLS)
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

    // Obtém os dados do corpo da requisição
    const { new_password, user_id } = await req.json();
    console.log('Edge Function: Nova senha recebida (parcial):', new_password ? new_password.substring(0, 3) + '...' : 'null');
    console.log('Edge Function: User ID recebido:', user_id);

    // Se não foi fornecido um user_id, assume que é para atualizar a senha do próprio usuário
    const targetUserId = user_id || user.sub;
    
    // Se foi fornecido um user_id, verifica se o usuário tem permissão para atualizar a senha de outro usuário
    if (user_id && user_id !== user.sub) {
      // Verifica se o usuário tem permissão para atualizar a senha de outro usuário
      const { data: authUserRoleData, error: authUserRoleError } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.sub)
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

      // Verifica se o usuário tem permissão para atualizar a senha de outro usuário
      if (authenticatedUserRole !== 'superadmin' && authenticatedUserRole !== 'adminrede') {
        console.log('Edge Function: Usuário não tem permissão para atualizar a senha de outro usuário.');
        return new Response(JSON.stringify({ message: 'Permissão negada: Você não tem autorização para atualizar a senha de outro usuário.' }), {
          status: 403,
          headers: corsHeaders,
        });
      }

      // Se for um superadmin tentando atualizar outro superadmin, verifica se é permitido
      if (authenticatedUserRole === 'superadmin') {
        // Superadmins podem atualizar qualquer usuário
        console.log('Edge Function: Superadmin tem permissão para atualizar qualquer usuário.');
      } else if (authenticatedUserRole === 'adminrede') {
        // Admins de rede não podem atualizar superadmins
        const { data: targetUserRoleData, error: targetUserRoleError } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', user_id)
          .single();

        if (targetUserRoleError || !targetUserRoleData) {
          console.error('Edge Function: Erro ao buscar cargo do usuário alvo:', targetUserRoleError?.message);
          return new Response(JSON.stringify({ message: 'Permissão negada: Cargo do usuário alvo não encontrado.' }), {
            status: 403,
            headers: corsHeaders,
          });
        }

        const targetUserRole = targetUserRoleData.role;
        if (targetUserRole === 'superadmin') {
          console.log('Edge Function: Admin de rede não pode atualizar superadmin.');
          return new Response(JSON.stringify({ message: 'Permissão negada: Você não tem autorização para atualizar a senha de um superadmin.' }), {
            status: 403,
            headers: corsHeaders,
          });
        }
      }
    }

    if (!new_password) {
      console.log('Edge Function: Nova senha ausente no body.');
      return new Response(JSON.stringify({ message: 'Nova senha é obrigatória.' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Atualiza a senha do usuário usando a API de administração
    console.log('Edge Function: Tentando atualizar senha do usuário via Supabase Admin API...');
    const response = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/auth/v1/admin/users/${targetUserId}`,
      {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: new_password
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Edge Function: Erro ao atualizar senha do usuário via Supabase Admin API:', response.status, errorData);
      return new Response(JSON.stringify({ message: errorData.message || 'Erro ao atualizar senha.' }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    console.log('Edge Function: Senha atualizada com sucesso para o usuário:', targetUserId);
    return new Response(JSON.stringify({ success: true, message: 'Senha atualizada com sucesso.' }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('Edge Function: Erro inesperado na função update-password:', error);
    return new Response(JSON.stringify({ message: error.message || 'Erro interno do servidor.' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});