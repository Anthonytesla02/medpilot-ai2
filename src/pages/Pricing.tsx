import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Zap, ArrowLeft, Smartphone, Star, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription, PRICING_TIERS, PricingTier } from '@/hooks/useSubscription';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { initializePayment, usage } = useSubscription();
  const [loading, setLoading] = useState(false);

  const handlePurchase = async (tier: PricingTier) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      setLoading(true);
      const callbackUrl = `${window.location.origin}/payment-callback`;
      const { authorization_url } = await initializePayment(callbackUrl, tier);
      window.location.href = authorization_url;
    } catch (error) {
      console.error('Payment initialization error:', error);
      toast.error('Failed to initialize payment. Please try again.');
      setLoading(false);
    }
  };

  const tiers: { key: PricingTier; icon: React.ReactNode; popular?: boolean }[] = [
    { key: 'basic', icon: <Zap className="h-6 w-6" /> },
    { key: 'standard', icon: <Star className="h-6 w-6" />, popular: true },
    { key: 'premium', icon: <Sparkles className="h-6 w-6" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Pricing</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Simple, <span className="gradient-text">Credit-Based</span> Pricing
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Buy credits and use them whenever you need. No monthly commitments, 
            pay only for what you use.
          </p>
          {user && (
            <div className="mt-4 inline-flex items-center gap-2 bg-muted/50 rounded-full px-4 py-2">
              <span className="text-sm text-muted-foreground">Your Credits:</span>
              <Badge variant="secondary" className="text-lg font-bold">
                {usage?.creditsRemaining ?? 0}
              </Badge>
            </div>
          )}
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
          {tiers.map(({ key, icon, popular }, i) => {
            const tier = PRICING_TIERS[key];
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                className={cn(
                  "relative rounded-2xl border-2 p-6 transition-all hover:shadow-lg bg-card",
                  popular ? "border-primary" : "border-border"
                )}
              >
                {popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                    Best Value
                  </Badge>
                )}

                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                  popular ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  {icon}
                </div>

                <h3 className="text-xl font-bold mb-1">{tier.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{tier.description}</p>

                <div className="mb-4">
                  <span className="text-4xl font-bold">GH₵{tier.amount}</span>
                  <span className="text-muted-foreground text-sm ml-2">
                    ({(tier.amount / tier.credits).toFixed(2)}/credit)
                  </span>
                </div>

                <div className="space-y-2 mb-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="font-semibold">{tier.credits} credits</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Full access to all features</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Credits never expire</span>
                  </div>
                </div>

                <Button
                  onClick={() => handlePurchase(key)}
                  disabled={loading}
                  variant={popular ? "default" : "outline"}
                  className="w-full"
                >
                  {loading ? 'Processing...' : `Get ${tier.credits} Credits`}
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Payment Methods */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 text-muted-foreground">
            <Smartphone className="h-5 w-5" />
            <span>Pay with Mobile Money, Card, or Bank Transfer</span>
          </div>
        </motion.div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-16 max-w-2xl mx-auto"
        >
          <h3 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h3>
          <div className="space-y-4">
            <div className="bg-muted/30 rounded-xl p-4">
              <h4 className="font-semibold mb-2">What is a credit?</h4>
              <p className="text-sm text-muted-foreground">
                Each credit allows you to send one AI chat message or generate one case study.
              </p>
            </div>
            <div className="bg-muted/30 rounded-xl p-4">
              <h4 className="font-semibold mb-2">Do credits expire?</h4>
              <p className="text-sm text-muted-foreground">
                No! Your credits never expire. Use them whenever you need.
              </p>
            </div>
            <div className="bg-muted/30 rounded-xl p-4">
              <h4 className="font-semibold mb-2">Can I buy more credits anytime?</h4>
              <p className="text-sm text-muted-foreground">
                Yes! You can purchase additional credits at any time from your profile or when you run out.
              </p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
