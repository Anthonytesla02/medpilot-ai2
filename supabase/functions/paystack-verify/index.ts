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

    // Get credits from metadata - ensure it's a number
    const creditsToAdd = Number(transaction.metadata?.credits) || 5;
    const tierName = transaction.metadata?.tier_name || 'Credits';

    // Verify that this payment reference belongs to the authenticated user
    const { data: paymentRecord, error: recordErr } = await supabase
      .from('payment_history')
      .select('user_id')
      .eq('paystack_reference', reference)
      .maybeSingle();

    if (recordErr || !paymentRecord) {
      return new Response(
        JSON.stringify({ error: 'Payment reference not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (paymentRecord.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Payment reference does not belong to authenticated user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update payment history (scoped to owner)
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
          credits_added: creditsToAdd,
          tier_name: tierName,
        },
      })
      .eq('paystack_reference', reference)
      .eq('user_id', user.id);


    if (isSuccessful) {
      // Get current usage to add credits
      const { data: currentUsage } = await supabase
        .from('usage_tracking')
        .select('credits_remaining, credits_purchased')
        .eq('user_id', user.id)
        .maybeSingle();

      const currentCredits = Number(currentUsage?.credits_remaining) || 0;
      const currentPurchased = Number(currentUsage?.credits_purchased) || 0;

      // Add credits to user
      if (currentUsage) {
        await supabase
          .from('usage_tracking')
          .update({
            credits_remaining: currentCredits + creditsToAdd,
            credits_purchased: currentPurchased + creditsToAdd,
          })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('usage_tracking')
          .insert({
            user_id: user.id,
            credits_remaining: creditsToAdd,
            credits_purchased: creditsToAdd,
          });
      }

      // Update subscription status to active
      await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          paystack_customer_code: transaction.customer?.customer_code,
        })
        .eq('user_id', user.id);

      console.log('Credits added:', { 
        user_id: user.id, 
        credits_added: creditsToAdd,
        new_total: currentCredits + creditsToAdd,
      });
    }

    return new Response(
      JSON.stringify({
        success: isSuccessful,
        message: isSuccessful 
          ? `Payment verified! ${creditsToAdd} credits added to your account.` 
          : 'Payment was not successful',
        transaction: {
          status: transaction.status,
          amount: transaction.amount / 100,
          currency: transaction.currency,
          channel: transaction.channel,
          credits_added: isSuccessful ? creditsToAdd : 0,
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
