-- Add credits column to usage_tracking table
ALTER TABLE public.usage_tracking 
ADD COLUMN credits_remaining integer NOT NULL DEFAULT 3;

-- Add credits_purchased column to track total purchased
ALTER TABLE public.usage_tracking 
ADD COLUMN credits_purchased integer NOT NULL DEFAULT 0;

-- Update handle_new_user_subscription to include initial 3 free credits
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Create subscription record with trial status
  INSERT INTO public.subscriptions (user_id, status)
  VALUES (NEW.id, 'trial');
  
  -- Create usage tracking record with 3 free credits
  INSERT INTO public.usage_tracking (user_id, credits_remaining)
  VALUES (NEW.id, 3);
  
  RETURN NEW;
END;
$function$;