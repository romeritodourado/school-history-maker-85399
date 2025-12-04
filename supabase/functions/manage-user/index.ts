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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { 'Authorization': req.headers.get('Authorization')! } },
      }
    );

    const { data: { user: currentUser }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !currentUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized: No active user session.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

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

    const { action, userId, email, password, name, role, municipality_id, school_id } = await req.json();

    let isAllowed = false;
    if (currentProfile.role === 'super_admin') {
      isAllowed = true;
    } else if (currentProfile.role === 'municipal_secretary' || currentProfile.role === 'network_manager') {
      if (role !== 'super_admin' && municipality_id === currentProfile.municipality_id) {
        isAllowed = true;
      }
    } else if (currentProfile.role === 'school_admin') {
      if ((role === 'secretary' || role === 'administrative_assistant') && school_id === currentProfile.school_id) {
        isAllowed = true;
      }
    }

    if (!isAllowed) {
      return new Response(JSON.stringify({ error: 'Forbidden: User not allowed to perform this action or in this scope.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (action === 'create') {
      const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
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
      
      // Profile creation is now handled by the 'on_auth_user_created' trigger.
      // The trigger will use the user_metadata to populate the profile table.

      return new Response(JSON.stringify({ message: 'User created successfully', userId: newUser.user?.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } else if (action === 'update') {
      if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID is required for update action.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const updateAuthData: { email?: string; password?: string; user_metadata?: any } = {
        user_metadata: {
          name,
          role,
          municipality_id: municipality_id || null,
          school_id: school_id || null,
        },
      };
      if (email) updateAuthData.email = email;
      if (password) updateAuthData.password = password;

      const { data: updatedAuthUser, error: updateAuthUserError } = await supabaseAdmin.auth.admin.updateUserById(userId, updateAuthData);

      if (updateAuthUserError) {
        console.error('Error updating auth user:', updateAuthUserError);
        return new Response(JSON.stringify({ error: updateAuthUserError.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      // Also update profile entry for the user, as the trigger only runs on INSERT.
      const { error: profileUpdateError } = await supabaseAdmin
        .from('profiles')
        .update({
          email: email,
          name: name,
          role: role,
          municipality_id: municipality_id || null,
          school_id: school_id || null,
        })
        .eq('id', userId);

      if (profileUpdateError) {
        console.error('Error updating profile for user:', profileUpdateError);
        return new Response(JSON.stringify({ error: profileUpdateError.message || 'Failed to update user profile.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      return new Response(JSON.stringify({ message: 'User updated successfully', userId: updatedAuthUser.user?.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } else if (action === 'delete') {
      if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID is required for delete action.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      // Before deleting the auth user, check if the current user is allowed to delete this specific user
      // For example, a municipal_secretary cannot delete a super_admin, or a user outside their municipality.
      // This check is crucial for security.
      const { data: userToDeleteProfile, error: userToDeleteProfileError } = await supabaseAdmin
        .from('profiles')
        .select('role, municipality_id, school_id')
        .eq('id', userId)
        .single();

      if (userToDeleteProfileError || !userToDeleteProfile) {
        return new Response(JSON.stringify({ error: 'User to delete profile not found.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        });
      }

      // More granular permission checks for deletion
      let canDelete = false;
      if (currentProfile.role === 'super_admin') {
        canDelete = true; // Super admin can delete anyone
      } else if ((currentProfile.role === 'municipal_secretary' || currentProfile.role === 'network_manager') && currentProfile.municipality_id) {
        // Municipal roles can delete users within their municipality, but not super_admin
        if (userToDeleteProfile.municipality_id === currentProfile.municipality_id && userToDeleteProfile.role !== 'super_admin') {
          canDelete = true;
        }
      } else if (currentProfile.role === 'school_admin' && currentProfile.school_id) {
        // School admin can delete secretaries or administrative assistants within their school
        if (userToDeleteProfile.school_id === currentProfile.school_id && (userToDeleteProfile.role === 'secretary' || userToDeleteProfile.role === 'administrative_assistant')) {
          canDelete = true;
        }
      }

      if (!canDelete) {
        return new Response(JSON.stringify({ error: 'Forbidden: Not allowed to delete this user.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        });
      }

      const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (deleteUserError) {
        console.error('Error deleting user:', deleteUserError);
        return new Response(JSON.stringify({ error: deleteUserError.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      return new Response(JSON.stringify({ message: 'User deleted successfully' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action specified.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

  } catch (error: any) {
    console.error('Edge Function error:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});