import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting admin user fix...');

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const email = 'Qarishqa@performance-center.az';
    const password = '2689007pc';
    const username = 'Qarishqa';
    const fullName = 'Fuad Heydərov';

    console.log(`Attempting to create/update user: ${email}`);

    // Check if user already exists
    const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById('4885d4c0-556a-4443-8023-2a9924013fbd');
    
    if (existingUser && existingUser.user) {
      console.log('User exists, updating email and password...');
      
      // Update existing user's email and password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById('4885d4c0-556a-4443-8023-2a9924013fbd', {
        email: email,
        password: password,
        email_confirm: true
      });

      if (updateError) {
        console.error('Error updating user:', updateError);
        throw updateError;
      }

      console.log('User updated successfully');
    } else {
      console.log('Creating new user...');
      
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          username: username
        }
      });

      if (createError) {
        console.error('Error creating user:', createError);
        throw createError;
      }

      if (newUser.user) {
        console.log('User created, updating profile...');
        
        // Update profile table
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            user_id: newUser.user.id,
            username: username,
            full_name: fullName,
            role: 'admin'
          });

        if (profileError) {
          console.error('Error updating profile:', profileError);
          throw profileError;
        }
      }
    }

    // Ensure profile is updated with correct username
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        username: username,
        full_name: fullName,
        role: 'admin'
      })
      .eq('user_id', '4885d4c0-556a-4443-8023-2a9924013fbd');

    if (profileUpdateError) {
      console.error('Error updating profile:', profileUpdateError);
      throw profileUpdateError;
    }

    console.log('Admin user fixed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Admin user configured successfully',
        credentials: {
          username: username,
          email: email,
          password: password
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('Error in fix-admin-user function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});