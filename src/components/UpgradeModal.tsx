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
import { Crown, MessageCircle, BookOpen, CheckCircle, Loader2, Smartphone } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
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
      const { authorization_url } = await initializePayment(callbackUrl);
      
      // Redirect to Paystack payment page
      window.location.href = authorization_url;
    } catch (error) {
      console.error('Payment initialization error:', error);
      toast.error('Failed to initialize payment. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Crown className="h-6 w-6 text-yellow-500" />
            Upgrade to Premium
          </DialogTitle>
          <DialogDescription>
            You've used your free trial. Upgrade to continue using MediGuide AI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Usage Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm">Your Usage</h4>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                Chat Messages
              </span>
              <Badge variant={usage?.chatMessagesUsed === usage?.chatMessagesLimit ? "destructive" : "secondary"}>
                {usage?.chatMessagesUsed || 0}/{usage?.chatMessagesLimit || 3}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Case Studies
              </span>
              <Badge variant={usage?.caseStudiesUsed === usage?.caseStudiesLimit ? "destructive" : "secondary"}>
                {usage?.caseStudiesUsed || 0}/{usage?.caseStudiesLimit || 3}
              </Badge>
            </div>
          </div>

          {/* Premium Benefits */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Premium Benefits</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Unlimited chat messages
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Unlimited case study generations
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Access to all medical topics
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Priority support
              </li>
            </ul>
          </div>

          {/* Pricing */}
          <div className="bg-primary/5 rounded-lg p-4 text-center space-y-2">
            <div className="text-3xl font-bold text-primary">GH₵50</div>
            <div className="text-sm text-muted-foreground">per month</div>
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
                Upgrade Now
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
