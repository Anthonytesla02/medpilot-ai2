import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SubscriptionState {
  status: 'trial' | 'active' | 'expired' | 'cancelled';
  currentPeriodEnd: string | null;
}

interface UsageState {
  chatMessagesUsed: number;
  caseStudiesUsed: number;
  chatMessagesLimit: number;
  caseStudiesLimit: number;
}

interface LimitsState {
  canUseChat: boolean;
  canUseCaseStudy: boolean;
  isSubscribed: boolean;
}

export function useSubscription() {
  const { user, session } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [usage, setUsage] = useState<UsageState | null>(null);
  const [limits, setLimits] = useState<LimitsState | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      setSubscription({
        status: data.subscription.status,
        currentPeriodEnd: data.subscription.current_period_end,
      });

      setUsage({
        chatMessagesUsed: data.usage.chat_messages_used,
        caseStudiesUsed: data.usage.case_studies_used,
        chatMessagesLimit: data.usage.chat_messages_limit,
        caseStudiesLimit: data.usage.case_studies_limit,
      });

      setLimits({
        canUseChat: data.limits.can_use_chat,
        canUseCaseStudy: data.limits.can_use_case_study,
        isSubscribed: data.limits.is_subscribed,
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (user) {
      checkSubscription();
    } else {
      setLoading(false);
    }
  }, [user, checkSubscription]);

  const incrementUsage = async (type: 'chat' | 'case_study') => {
    if (!session?.access_token) return;

    try {
      await supabase.functions.invoke('increment-usage', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { type },
      });

      // Refresh subscription state
      await checkSubscription();
    } catch (error) {
      console.error('Error incrementing usage:', error);
    }
  };

  const initializePayment = async (callbackUrl: string) => {
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase.functions.invoke('paystack-initialize', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: { callback_url: callbackUrl },
    });

    if (error) throw error;
    return data;
  };

  const verifyPayment = async (reference: string) => {
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase.functions.invoke('paystack-verify', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: { reference },
    });

    if (error) throw error;

    // Refresh subscription state after verification
    await checkSubscription();
    
    return data;
  };

  return {
    subscription,
    usage,
    limits,
    loading,
    checkSubscription,
    incrementUsage,
    initializePayment,
    verifyPayment,
  };
}
