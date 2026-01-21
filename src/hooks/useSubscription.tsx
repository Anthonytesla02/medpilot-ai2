import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SubscriptionState {
  status: 'trial' | 'active' | 'expired' | 'cancelled';
  currentPeriodEnd: string | null;
}

interface UsageState {
  creditsRemaining: number;
  creditsPurchased: number;
  chatMessagesUsed: number;
  caseStudiesUsed: number;
}

interface LimitsState {
  canUseChat: boolean;
  canUseCaseStudy: boolean;
  isSubscribed: boolean;
  hasCredits: boolean;
}

export type PricingTier = 'basic' | 'standard' | 'premium';

export const PRICING_TIERS = {
  basic: { amount: 1, credits: 5, name: 'Basic Pack', description: 'Great for trying out' },
  standard: { amount: 10, credits: 50, name: 'Standard Pack', description: 'Best value for regular use' },
  premium: { amount: 50, credits: 300, name: 'Premium Pack', description: 'Maximum savings' },
};

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
        creditsRemaining: data.usage.credits_remaining,
        creditsPurchased: data.usage.credits_purchased,
        chatMessagesUsed: data.usage.chat_messages_used,
        caseStudiesUsed: data.usage.case_studies_used,
      });

      setLimits({
        canUseChat: data.limits.can_use_chat,
        canUseCaseStudy: data.limits.can_use_case_study,
        isSubscribed: data.limits.is_subscribed,
        hasCredits: data.limits.has_credits,
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
      const { data, error } = await supabase.functions.invoke('increment-usage', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { type },
      });

      if (error) throw error;

      // Update local state immediately
      if (usage && data?.credits_remaining !== undefined) {
        setUsage({
          ...usage,
          creditsRemaining: data.credits_remaining,
          chatMessagesUsed: type === 'chat' ? usage.chatMessagesUsed + 1 : usage.chatMessagesUsed,
          caseStudiesUsed: type === 'case_study' ? usage.caseStudiesUsed + 1 : usage.caseStudiesUsed,
        });
        
        if (limits) {
          setLimits({
            ...limits,
            hasCredits: data.credits_remaining > 0,
            canUseChat: data.credits_remaining > 0,
            canUseCaseStudy: data.credits_remaining > 0,
          });
        }
      }

      return data;
    } catch (error) {
      console.error('Error incrementing usage:', error);
      throw error;
    }
  };

  const initializePayment = async (callbackUrl: string, tier: PricingTier = 'basic') => {
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase.functions.invoke('paystack-initialize', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: { callback_url: callbackUrl, tier },
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
