import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InitializeRequest {
  email: string;
  amount: number;
  callback_url: string;
  channels?: string[];
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

    const { callback_url } = await req.json() as InitializeRequest;

    // Generate unique reference
    const reference = `MEDIGUIDE-${user.id.slice(0, 8)}-${Date.now()}`;

    // Initialize Paystack transaction (50 GHC = 5000 pesewas)
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        amount: 5000, // 50 GHC in pesewas
        currency: 'GHS',
        reference,
        callback_url,
        channels: ['mobile_money', 'card', 'bank'],
        metadata: {
          user_id: user.id,
          plan: 'monthly',
        },
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      console.error('Paystack error:', paystackData);
      throw new Error(paystackData.message || 'Failed to initialize payment');
    }

    // Record pending payment
    await supabase.from('payment_history').insert({
      user_id: user.id,
      amount: 5000,
      currency: 'GHS',
      paystack_reference: reference,
      status: 'pending',
      payment_method: 'paystack',
    });

    console.log('Payment initialized:', { reference, user_id: user.id });

    return new Response(
      JSON.stringify({
        authorization_url: paystackData.data.authorization_url,
        reference: paystackData.data.reference,
        access_code: paystackData.data.access_code,
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
