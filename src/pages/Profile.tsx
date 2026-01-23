import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { 
  User, 
  Mail, 
  LogOut, 
  Shield, 
  BookOpen, 
  HelpCircle,
  ChevronRight,
  Stethoscope,
  Moon,
  Sun,
  Crown,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { BottomNav } from '@/components/BottomNav';
import { PageLoader } from '@/components/PageLoader';
import { UpgradeModal } from '@/components/UpgradeModal';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Profile {
  display_name: string | null;
  email: string | null;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { theme, setTheme } = useTheme();
  const { user, signOut, loading: authLoading } = useAuth();
  const { subscription, usage, limits, loading: subLoading } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('display_name, email')
      .eq('user_id', user!.id)
      .maybeSingle();

    if (!error && data) {
      setProfile(data);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: 'Signed out',
      description: 'You have been signed out successfully.',
    });
    navigate('/auth');
  };

  const menuItems = [
    { icon: BookOpen, label: 'About Ghana STG', description: '7th Edition, 2017' },
    { icon: Shield, label: 'Privacy Policy', description: 'How we handle your data' },
    { icon: HelpCircle, label: 'Help & Support', description: 'Get assistance' },
  ];

  if (authLoading || loading || subLoading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20">
      <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} />

      {/* Header */}
      <header className="glass border-b border-border/50">
        <div className="px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-foreground">
                {profile?.display_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-xl font-bold">{profile?.display_name || 'User'}</h1>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Badge 
                variant={limits?.isSubscribed ? "default" : "secondary"} 
                className="mt-1"
              >
                {limits?.isSubscribed ? (
                  <>
                    <Crown className="w-3 h-3 mr-1" />
                    Premium
                  </>
                ) : (
                  'Free Trial'
                )}
              </Badge>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Subscription Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-4 py-4"
      >
        {limits?.isSubscribed ? (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Premium Plan</span>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Active
                </Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Unlimited chat messages
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Unlimited case studies
                </div>
                {subscription?.currentPeriodEnd && (
                  <p className="text-xs text-muted-foreground pt-2">
                    Renews on {format(new Date(subscription.currentPeriodEnd), 'MMM dd, yyyy')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold">Free Trial</span>
                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                  Limited
                </Badge>
              </div>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Credits remaining</span>
                  <span className="font-semibold text-foreground">{usage?.creditsRemaining || 0}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Total messages sent</span>
                  <span>{usage?.chatMessagesUsed || 0}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Case studies generated</span>
                  <span>{usage?.caseStudiesUsed || 0}</span>
                </div>
              </div>
              <Button onClick={() => setShowUpgradeModal(true)} className="w-full">
                <Crown className="w-4 h-4 mr-2" />
                Buy More Credits
              </Button>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="px-4 py-2"
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center gap-2 text-primary mb-1">
              <Stethoscope className="w-4 h-4" />
              <span className="text-xs font-medium">Knowledge Base</span>
            </div>
            <p className="text-2xl font-bold">15+</p>
            <p className="text-xs text-muted-foreground">Medical Topics</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center gap-2 text-primary mb-1">
              <BookOpen className="w-4 h-4" />
              <span className="text-xs font-medium">Source</span>
            </div>
            <p className="text-2xl font-bold">2017</p>
            <p className="text-xs text-muted-foreground">Ghana STG Edition</p>
          </div>
        </div>
      </motion.div>

      {/* Settings */}
      <div className="px-4 py-4 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">Settings</h2>
          <div className="p-4 rounded-xl bg-card border border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Moon className="w-5 h-5 text-muted-foreground" /> : <Sun className="w-5 h-5 text-muted-foreground" />}
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className="text-xs text-muted-foreground">Switch theme appearance</p>
              </div>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">Information</h2>
          <div className="space-y-2">
            {menuItems.map((item, i) => (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="w-full p-4 rounded-xl bg-card border border-border/50 flex items-center gap-3 hover:border-primary/30 transition-colors"
              >
                <item.icon className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1 text-left">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </motion.button>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="pt-4"
        >
          <Button
            variant="destructive"
            className="w-full rounded-xl h-12"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </motion.div>

        <p className="text-xs text-center text-muted-foreground pt-4">
          MediGuide AI v1.0.0<br />
          Powered by Ghana Standard Treatment Guidelines
        </p>
      </div>

      <BottomNav />
    </div>
  );
}
