import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Stethoscope, ArrowRight, Sparkles, Shield, Clock, BookOpen, Zap, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { PageLoader } from '@/components/PageLoader';
import { PRICING_TIERS } from '@/hooks/useSubscription';

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/chat');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <PageLoader />;
  }

  const features = [
    {
      icon: BookOpen,
      title: 'Ghana STG Guidelines',
      description: 'Access comprehensive treatment protocols from the official Ghana Standard Treatment Guidelines.',
    },
    {
      icon: Sparkles,
      title: 'AI-Powered Answers',
      description: 'Get instant, accurate responses to your medical questions using advanced AI technology.',
    },
    {
      icon: Shield,
      title: 'Reliable Information',
      description: 'All answers are grounded in official medical guidelines for trustworthy guidance.',
    },
    {
      icon: Clock,
      title: '24/7 Availability',
      description: 'Access medical treatment information anytime, anywhere on any device.',
    },
  ];

  const tier = PRICING_TIERS.standard;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-6 shadow-glow"
          >
            <Stethoscope className="w-10 h-10 text-primary-foreground" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl md:text-5xl font-bold mb-4"
          >
            <span className="gradient-text">MediGuide AI</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-muted-foreground mb-8"
          >
            Your intelligent assistant for the Ghana Standard Treatment Guidelines. 
            Get accurate medical treatment information instantly.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              size="lg"
              onClick={() => navigate('/auth')}
              className="gap-2 rounded-xl h-12 px-8 text-base shadow-glow"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/auth')}
              className="gap-2 rounded-xl h-12 px-8 text-base"
            >
              Sign In
            </Button>
          </motion.div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-16 w-full max-w-5xl"
        >
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + i * 0.1 }}
              whileHover={{ y: -4 }}
              className="p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-soft transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, <span className="gradient-text">Credit-Based</span> Pricing
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Buy credits and use them whenever you need. No monthly commitments.
            </p>
          </motion.div>

          <div className="max-w-md mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="relative rounded-2xl border-2 border-primary p-6 bg-card transition-all hover:shadow-lg"
            >
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                Full Access
              </Badge>

              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Zap className="h-5 w-5 text-primary" />
              </div>

              <h3 className="text-lg font-bold mb-1">{tier.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{tier.description}</p>

              <div className="mb-4">
                <span className="text-3xl font-bold">GH₵{tier.amount}</span>
              </div>

              <div className="space-y-2 mb-6 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>{tier.credits} credits</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Never expires</span>
                </div>
              </div>

              <Button
                onClick={() => navigate('/auth')}
                className="w-full"
              >
                Get Started
              </Button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-8"
          >
            <Button variant="link" onClick={() => navigate('/pricing')}>
              View full pricing details →
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-border/50">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© 2024 MediGuide AI. Powered by Ghana STG 7th Edition.</p>
          <p className="text-xs text-center md:text-right">
            For educational purposes only. Consult healthcare professionals for medical decisions.
          </p>
        </div>
      </footer>
    </div>
  );
}