import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Zap, Loader2, Smartphone, Check } from 'lucide-react';
import { useSubscription, PRICING_TIERS } from '@/hooks/useSubscription';
import { toast } from 'sonner';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerType?: 'chat' | 'case_study';
}

export function UpgradeModal({ open, onOpenChange, triggerType }: UpgradeModalProps) {
  const { usage, initializePayment } = useSubscription();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    try {
      setLoading(true);
      const callbackUrl = `${window.location.origin}/payment-callback`;
      const { authorization_url } = await initializePayment(callbackUrl, 'starter');
      
      // Redirect to Paystack payment page
      window.location.href = authorization_url;
    } catch (error) {
      console.error('Payment initialization error:', error);
      toast.error('Failed to initialize payment. Please try again.');
      setLoading(false);
    }
  };

  const tierData = PRICING_TIERS.starter;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Crown className="h-6 w-6 text-yellow-500" />
            Get More Credits
          </DialogTitle>
          <DialogDescription>
            Purchase credits to continue using MediGuide AI.
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

          {/* Starter Pack Card */}
          <div className="p-4 rounded-xl border-2 border-primary bg-primary/5">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-primary" />
              <span className="font-semibold">{tierData.name}</span>
            </div>
            <div className="text-2xl font-bold">
              GH₵{tierData.amount}
            </div>
            <div className="text-sm text-muted-foreground">
              {tierData.credits} credits
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
                Pay GH₵{tierData.amount} for {tierData.credits} Credits
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}