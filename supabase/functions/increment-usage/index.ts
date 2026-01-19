import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { type } = await req.json();

    if (!type || !['chat', 'case_study'].includes(type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid usage type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current usage
    const { data: usage } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!usage) {
      // Create usage record if it doesn't exist
      await supabase.from('usage_tracking').insert({
        user_id: user.id,
        credits_remaining: 2, // Started with 3, used 1
        chat_messages_used: type === 'chat' ? 1 : 0,
        case_studies_used: type === 'case_study' ? 1 : 0,
      });
    } else {
      // Check if user has credits
      if (usage.credits_remaining <= 0) {
        return new Response(
          JSON.stringify({ error: 'No credits remaining', credits_remaining: 0 }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Decrement credits and increment usage counter
      const updateData = type === 'chat'
        ? { 
            credits_remaining: usage.credits_remaining - 1,
            chat_messages_used: usage.chat_messages_used + 1 
          }
        : { 
            credits_remaining: usage.credits_remaining - 1,
            case_studies_used: usage.case_studies_used + 1 
          };

      await supabase
        .from('usage_tracking')
        .update(updateData)
        .eq('user_id', user.id);
    }

    const newCredits = usage ? usage.credits_remaining - 1 : 2;
    console.log('Usage incremented:', { user_id: user.id, type, credits_remaining: newCredits });

    return new Response(
      JSON.stringify({ success: true, credits_remaining: newCredits }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error incrementing usage:', error);
    const message = error instanceof Error ? error.message : 'Failed to increment usage';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
