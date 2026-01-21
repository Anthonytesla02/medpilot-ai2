import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Zap, Loader2, Smartphone, Check, Star, Sparkles } from 'lucide-react';
import { useSubscription, PRICING_TIERS, PricingTier } from '@/hooks/useSubscription';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerType?: 'chat' | 'case_study';
}

export function UpgradeModal({ open, onOpenChange, triggerType }: UpgradeModalProps) {
  const { usage, initializePayment } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<PricingTier>('standard');

  const handleUpgrade = async () => {
    try {
      setLoading(true);
      const callbackUrl = `${window.location.origin}/payment-callback`;
      const { authorization_url } = await initializePayment(callbackUrl, selectedTier);
      
      // Redirect to Paystack payment page
      window.location.href = authorization_url;
    } catch (error) {
      console.error('Payment initialization error:', error);
      toast.error('Failed to initialize payment. Please try again.');
      setLoading(false);
    }
  };

  const tiers: { key: PricingTier; icon: React.ReactNode; popular?: boolean }[] = [
    { key: 'basic', icon: <Zap className="h-5 w-5" /> },
    { key: 'standard', icon: <Star className="h-5 w-5" />, popular: true },
    { key: 'premium', icon: <Sparkles className="h-5 w-5" /> },
  ];

  const selectedTierData = PRICING_TIERS[selectedTier];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Crown className="h-6 w-6 text-yellow-500" />
            Top Up Credits
          </DialogTitle>
          <DialogDescription>
            Choose a credit pack that suits your needs.
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

          {/* Tier Selection */}
          <div className="grid grid-cols-3 gap-2">
            {tiers.map(({ key, icon, popular }) => {
              const tier = PRICING_TIERS[key];
              const isSelected = selectedTier === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedTier(key)}
                  className={cn(
                    "relative p-3 rounded-xl border-2 transition-all",
                    isSelected 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {popular && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full">
                      Popular
                    </span>
                  )}
                  <div className={cn(
                    "flex justify-center mb-1",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )}>
                    {icon}
                  </div>
                  <div className="text-lg font-bold">
                    GH₵{tier.amount}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {tier.credits} credits
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Pack Details */}
          <div className="p-4 rounded-xl border-2 border-primary bg-primary/5">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">{selectedTierData.name}</span>
              <span className="text-xs text-muted-foreground">
                GH₵{(selectedTierData.amount / selectedTierData.credits).toFixed(2)}/credit
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {selectedTierData.description}
            </div>
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
            onClick={handleUpgrade} 
            className="w-full" 
            size="lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initializing Payment...
              </>
            ) : (
              <>
                <Crown className="mr-2 h-4 w-4" />
                Pay GH₵{selectedTierData.amount} for {selectedTierData.credits} Credits
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
