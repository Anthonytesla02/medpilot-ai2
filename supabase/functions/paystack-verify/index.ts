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
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) {
      throw new Error('Paystack secret key not configured');
    }

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

    const { reference } = await req.json();

    if (!reference) {
      return new Response(
        JSON.stringify({ error: 'Reference is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify transaction with Paystack
    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
      },
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      console.error('Paystack verification error:', paystackData);
      throw new Error(paystackData.message || 'Failed to verify payment');
    }

    const transaction = paystackData.data;
    const isSuccessful = transaction.status === 'success';

    // Update payment history
    await supabase
      .from('payment_history')
      .update({
        status: isSuccessful ? 'success' : 'failed',
        payment_method: transaction.channel,
        metadata: {
          gateway_response: transaction.gateway_response,
          paid_at: transaction.paid_at,
          channel: transaction.channel,
          authorization: transaction.authorization,
        },
      })
      .eq('paystack_reference', reference);

    if (isSuccessful) {
      // Calculate subscription period (30 days)
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Update subscription status
      await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          paystack_customer_code: transaction.customer?.customer_code,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
        })
        .eq('user_id', user.id);

      // Reset usage tracking
      await supabase
        .from('usage_tracking')
        .update({
          chat_messages_used: 0,
          case_studies_used: 0,
          last_reset_at: now.toISOString(),
        })
        .eq('user_id', user.id);

      console.log('Subscription activated:', { user_id: user.id, period_end: periodEnd });
    }

    return new Response(
      JSON.stringify({
        success: isSuccessful,
        message: isSuccessful ? 'Payment verified successfully' : 'Payment was not successful',
        transaction: {
          status: transaction.status,
          amount: transaction.amount / 100,
          currency: transaction.currency,
          channel: transaction.channel,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error verifying payment:', error);
    const message = error instanceof Error ? error.message : 'Failed to verify payment';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
