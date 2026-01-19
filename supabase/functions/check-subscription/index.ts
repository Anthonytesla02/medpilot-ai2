import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FREE_TRIAL_LIMITS = {
  chat_messages: 3,
  case_studies: 3,
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

    // Get subscription status
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // Get usage tracking
    const { data: usage, error: usageError } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // If no records exist, create them (for existing users)
    if (!subscription) {
      await supabase.from('subscriptions').insert({
        user_id: user.id,
        status: 'trial',
      });
    }

    if (!usage) {
      await supabase.from('usage_tracking').insert({
        user_id: user.id,
        chat_messages_used: 0,
        case_studies_used: 0,
      });
    }

    const currentSubscription = subscription || { status: 'trial' };
    const currentUsage = usage || { chat_messages_used: 0, case_studies_used: 0 };

    // Check if subscription is active
    let isActive = currentSubscription.status === 'active';
    
    // Check if active subscription has expired
    if (isActive && currentSubscription.current_period_end) {
      const periodEnd = new Date(currentSubscription.current_period_end);
      if (periodEnd < new Date()) {
        // Subscription has expired
        await supabase
          .from('subscriptions')
          .update({ status: 'expired' })
          .eq('user_id', user.id);
        isActive = false;
      }
    }

    // Determine usage limits
    const canUseChat = isActive || currentUsage.chat_messages_used < FREE_TRIAL_LIMITS.chat_messages;
    const canUseCaseStudy = isActive || currentUsage.case_studies_used < FREE_TRIAL_LIMITS.case_studies;

    return new Response(
      JSON.stringify({
        subscription: {
          status: isActive ? 'active' : currentSubscription.status,
          current_period_end: currentSubscription.current_period_end,
        },
        usage: {
          chat_messages_used: currentUsage.chat_messages_used,
          case_studies_used: currentUsage.case_studies_used,
          chat_messages_limit: FREE_TRIAL_LIMITS.chat_messages,
          case_studies_limit: FREE_TRIAL_LIMITS.case_studies,
        },
        limits: {
          can_use_chat: canUseChat,
          can_use_case_study: canUseCaseStudy,
          is_subscribed: isActive,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error checking subscription:', error);
    const message = error instanceof Error ? error.message : 'Failed to check subscription';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
