import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
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
  Sun
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { BottomNav } from '@/components/BottomNav';
import { PageLoader } from '@/components/PageLoader';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  display_name: string | null;
  email: string | null;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const { user, signOut, loading: authLoading } = useAuth();
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

  if (authLoading || loading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20">
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
            </div>
          </motion.div>
        </div>
      </header>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-4 py-4"
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
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">Settings</h2>
          <div className="p-4 rounded-xl bg-card border border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {darkMode ? <Moon className="w-5 h-5 text-muted-foreground" /> : <Sun className="w-5 h-5 text-muted-foreground" />}
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className="text-xs text-muted-foreground">Switch theme appearance</p>
              </div>
            </div>
            <Switch
              checked={darkMode}
              onCheckedChange={setDarkMode}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">Information</h2>
          <div className="space-y-2">
            {menuItems.map((item, i) => (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
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
          transition={{ delay: 0.5 }}
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
