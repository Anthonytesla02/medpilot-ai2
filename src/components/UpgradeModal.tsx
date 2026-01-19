import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Zap, Rocket, Loader2, Smartphone, Check } from 'lucide-react';
import { useSubscription, PRICING_TIERS, PricingTier } from '@/hooks/useSubscription';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerType?: 'chat' | 'case_study';
  isRefill?: boolean;
}

const tierIcons = {
  starter: Zap,
  standard: Crown,
  premium: Rocket,
  refill: Zap,
};

export function UpgradeModal({ open, onOpenChange, triggerType, isRefill = false }: UpgradeModalProps) {
  const { usage, initializePayment } = useSubscription();
  const [loading, setLoading] = useState<PricingTier | null>(null);
  const [selectedTier, setSelectedTier] = useState<PricingTier>(isRefill ? 'refill' : 'starter');

  const handleUpgrade = async (tier: PricingTier) => {
    try {
      setLoading(tier);
      const callbackUrl = `${window.location.origin}/payment-callback`;
      const { authorization_url } = await initializePayment(callbackUrl, tier);
      
      // Redirect to Paystack payment page
      window.location.href = authorization_url;
    } catch (error) {
      console.error('Payment initialization error:', error);
      toast.error('Failed to initialize payment. Please try again.');
      setLoading(null);
    }
  };

  const displayTiers = isRefill 
    ? ['refill'] as PricingTier[]
    : ['starter', 'standard', 'premium'] as PricingTier[];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Crown className="h-6 w-6 text-yellow-500" />
            {isRefill ? 'Refill Credits' : 'Get More Credits'}
          </DialogTitle>
          <DialogDescription>
            {isRefill 
              ? 'Top up your credits to continue using MediGuide AI.'
              : 'Choose a plan that works for you.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Credits */}
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <div className="text-sm text-muted-foreground">Current Credits</div>
            <div className="text-3xl font-bold text-primary">
              {usage?.creditsRemaining ?? 0}
            </div>
          </div>

          {/* Pricing Tiers */}
          <div className={cn(
            "grid gap-3",
            displayTiers.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-3"
          )}>
            {displayTiers.map((tier) => {
              const tierData = PRICING_TIERS[tier];
              const Icon = tierIcons[tier];
              const isSelected = selectedTier === tier;
              const isPopular = tier === 'standard';
              
              return (
                <button
                  key={tier}
                  onClick={() => setSelectedTier(tier)}
                  className={cn(
                    "relative p-4 rounded-xl border-2 transition-all text-left",
                    isSelected 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50",
                    isPopular && "ring-2 ring-yellow-500/20"
                  )}
                >
                  {isPopular && (
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-yellow-500 text-yellow-950">
                      Best Value
                    </Badge>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={cn(
                      "h-5 w-5",
                      tier === 'premium' ? "text-purple-500" :
                      tier === 'standard' ? "text-yellow-500" :
                      "text-primary"
                    )} />
                    <span className="font-semibold">{tierData.name}</span>
                  </div>
                  <div className="text-2xl font-bold">
                    GH₵{tierData.amount}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {tierData.credits} credits
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <Check className="h-5 w-5 text-primary" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* What you get */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-sm">Each credit allows:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                1 AI chat message
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                1 case study generation
              </li>
            </ul>
          </div>

          {/* Payment Methods */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Smartphone className="h-4 w-4" />
            <span>Pay with Mobile Money, Card, or Bank Transfer</span>
          </div>

          {/* CTA Button */}
          <Button 
            onClick={() => handleUpgrade(selectedTier)} 
            className="w-full" 
            size="lg"
            disabled={loading !== null}
          >
            {loading !== null ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initializing Payment...
              </>
            ) : (
              <>
                <Crown className="mr-2 h-4 w-4" />
                Pay GH₵{PRICING_TIERS[selectedTier].amount} for {PRICING_TIERS[selectedTier].credits} Credits
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
