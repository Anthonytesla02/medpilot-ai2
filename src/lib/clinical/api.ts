import { supabase } from '@/integrations/supabase/client';
export async function clinicalRequest<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('clinical-simulation', { body });
  if (error) {
    const response = 'context' in error ? error.context : null;
    if (response instanceof Response) {
      const details = await response.json().catch(() => null);
      throw new Error(details?.error ?? error.message);
    }
    throw new Error(error.message);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}