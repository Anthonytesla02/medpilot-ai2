import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const checkAdminRole = async () => {
      setLoading(true);

      // Ensure the user's role/profile are created and consistent with signup metadata.
      // This is required because email-based signups may not have a session during signup.
      const { error: bootstrapError } = await supabase.functions.invoke('bootstrap-user');
      if (bootstrapError) {
        // Non-fatal: we'll still try to check the role table.
        console.warn('bootstrap-user failed:', bootstrapError);
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!error && data) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    };

    checkAdminRole();
  }, [user]);

  return { isAdmin, loading };
}
