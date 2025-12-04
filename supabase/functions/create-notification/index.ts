import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id, type, target_id, message } = await req.json();
    console.log('create-notification: Received payload:', { user_id, type, target_id, message });

    if (!user_id || !type) {
      console.error('create-notification: Missing required fields:', { user_id, type });
      return new Response(JSON.stringify({ error: 'Missing required fields: user_id, type.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert([
        {
          user_id,
          type,
          target_id: target_id || null,
          message: message || null,
        },
      ])
      .select();

    if (error) {
      console.error('create-notification: Error inserting notification:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    console.log('create-notification: Notification inserted successfully:', data);
    return new Response(JSON.stringify({ message: 'Notification created successfully', data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('create-notification: Edge Function error in catch block:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});