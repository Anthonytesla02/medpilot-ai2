import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Pricing tiers
const PRICING_TIERS: Record<string, { amount: number; credits: number; name: string }> = {
  starter: { amount: 100, credits: 50, name: 'Starter Pack' },      // 1 GHS = 100 pesewas
};

interface InitializeRequest {
  callback_url: string;
  tier: 'starter' | 'standard' | 'premium' | 'refill';
}

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

    const { callback_url, tier = 'starter' }: InitializeRequest = await req.json();

    // Validate tier
    if (!PRICING_TIERS[tier]) {
      return new Response(
        JSON.stringify({ error: 'Invalid pricing tier' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const selectedTier = PRICING_TIERS[tier];

    // Generate unique reference
    const reference = `medi_${user.id.slice(0, 8)}_${tier}_${Date.now()}`;

    console.log('Initializing payment:', { 
      user_id: user.id, 
      email: user.email,
      tier,
      amount: selectedTier.amount,
      credits: selectedTier.credits,
      reference 
    });

    // Initialize Paystack transaction
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        amount: selectedTier.amount, // in pesewas
        currency: 'GHS',
        reference,
        callback_url,
        channels: ['mobile_money', 'card', 'bank'],
        metadata: {
          user_id: user.id,
          tier,
          credits: selectedTier.credits,
          tier_name: selectedTier.name,
        },
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      console.error('Paystack initialization error:', paystackData);
      throw new Error(paystackData.message || 'Failed to initialize payment');
    }

    // Record payment attempt in database
    await supabase.from('payment_history').insert({
      user_id: user.id,
      paystack_reference: reference,
      amount: selectedTier.amount,
      currency: 'GHS',
      status: 'pending',
      metadata: {
        tier,
        credits: selectedTier.credits,
        tier_name: selectedTier.name,
      },
    });

    console.log('Payment initialized:', { reference, authorization_url: paystackData.data.authorization_url });

    return new Response(
      JSON.stringify({
        authorization_url: paystackData.data.authorization_url,
        reference: paystackData.data.reference,
        access_code: paystackData.data.access_code,
        tier: selectedTier,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error initializing payment:', error);
    const message = error instanceof Error ? error.message : 'Failed to initialize payment';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
