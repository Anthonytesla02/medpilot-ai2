import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Zap, ArrowLeft, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription, PRICING_TIERS } from '@/hooks/useSubscription';
import { toast } from 'sonner';

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { initializePayment, usage } = useSubscription();
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      setLoading(true);
      const callbackUrl = `${window.location.origin}/payment-callback`;
      const { authorization_url } = await initializePayment(callbackUrl, 'starter');
      window.location.href = authorization_url;
    } catch (error) {
      console.error('Payment initialization error:', error);
      toast.error('Failed to initialize payment. Please try again.');
      setLoading(false);
    }
  };

  const tier = PRICING_TIERS.starter;

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

        {/* Pricing Card */}
        <div className="max-w-md mx-auto mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative rounded-2xl border-2 border-primary p-8 transition-all hover:shadow-lg bg-card"
          >
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
              Full Access
            </Badge>

            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-6 mx-auto">
              <Zap className="h-8 w-8 text-primary" />
            </div>

            <h3 className="text-2xl font-bold mb-2 text-center">{tier.name}</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center">{tier.description}</p>

            <div className="mb-6 text-center">
              <span className="text-5xl font-bold">GH₵{tier.amount}</span>
              <span className="text-muted-foreground"> / one-time</span>
            </div>

            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span>{tier.credits} credits</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span>Unlimited AI chat messages</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span>Unlimited case study generations</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span>Full access to Ghana STG</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span>Credits never expire</span>
              </div>
            </div>

            <Button
              onClick={handlePurchase}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? 'Processing...' : `Get ${tier.credits} Credits`}
            </Button>
          </motion.div>
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