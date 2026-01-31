import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type AppRole = 'admin' | 'user' | 'teacher' | 'worker_intern' | 'student';

function isAppRole(value: unknown): value is AppRole {
  return (
    value === 'admin' ||
    value === 'user' ||
    value === 'teacher' ||
    value === 'worker_intern' ||
    value === 'student'
  );
}

function emailToDisplayName(email: string | null | undefined) {
  if (!email) return 'User';
  const prefix = email.split('@')[0] || 'User';
  return prefix
    .replace(/[._-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const requestedRoleRaw = meta.role;
    const requestedRole: AppRole = isAppRole(requestedRoleRaw) ? requestedRoleRaw : 'user';

    const fullName = typeof meta.full_name === 'string' ? meta.full_name.trim() : '';
    const requestedSchool = typeof meta.school === 'string' ? meta.school.trim() : '';

    // Enforce single-admin policy: only allow setting admin when no admin exists.
    let finalRole: AppRole = requestedRole;
    if (finalRole === 'admin') {
      const { data: adminExists, error: adminExistsError } = await supabase.rpc('admin_exists');
      if (adminExistsError) throw adminExistsError;
      if (adminExists) finalRole = 'user';
    }

    // Ensure profile exists (and keep it in sync with auth metadata)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    const displayName = fullName || emailToDisplayName(user.email);
    const school = finalRole !== 'admin' ? (requestedSchool || null) : null;

    if (existingProfile) {
      await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          email: user.email ?? null,
          school,
        })
        .eq('user_id', user.id);
    } else {
      await supabase.from('profiles').insert({
        user_id: user.id,
        display_name: displayName,
        email: user.email ?? null,
        school,
      });
    }

    // Ensure user role exists and matches the finalRole
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('id, role')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existingRole) {
      await supabase.from('user_roles').update({ role: finalRole }).eq('id', existingRole.id);
    } else {
      await supabase.from('user_roles').insert({ user_id: user.id, role: finalRole });
    }

    return new Response(
      JSON.stringify({ success: true, role: finalRole }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error bootstrapping user:', error);
    const message = error instanceof Error ? error.message : 'Failed to bootstrap user';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
