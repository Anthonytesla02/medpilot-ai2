import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  FileText, 
  BarChart3, 
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageLoader } from '@/components/PageLoader';
import { ModuleManager } from '@/components/admin/ModuleManager';
import { TestManager } from '@/components/admin/TestManager';
import { DrugManager } from '@/components/admin/DrugManager';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  totalTests: number;
  totalCompletions: number;
}

interface UserProfile {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalTests: 0,
    totalCompletions: 0,
  });
  const [loading, setLoading] = useState(true);

  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    
    if (!adminLoading && !isAdmin) {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'You do not have admin privileges.',
      });
      navigate('/profile');
      return;
    }

    if (isAdmin) {
      fetchData();
      // Poll every second for real-time updates
      const interval = setInterval(fetchStats, 1000);
      return () => clearInterval(interval);
    }
  }, [user, authLoading, isAdmin, adminLoading, navigate]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchUsers(), fetchStats()]);
    setLoading(false);
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setUsers(data);
    }
  };

  const fetchStats = async () => {
    const [profilesResult, testsResult, resultsResult] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact' }),
      supabase.from('tests').select('id', { count: 'exact' }),
      supabase.from('test_results').select('id', { count: 'exact' }),
    ]);

    // Get active users (users who have completed at least one test)
    const { data: activeUsersData } = await supabase
      .from('test_results')
      .select('user_id')
      .limit(1000);

    const uniqueActiveUsers = new Set(activeUsersData?.map(r => r.user_id) || []);

    setStats({
      totalUsers: profilesResult.count || 0,
      activeUsers: uniqueActiveUsers.size,
      totalTests: testsResult.count || 0,
      totalCompletions: resultsResult.count || 0,
    });
  };

  if (authLoading || adminLoading || loading) {
    return <PageLoader />;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-border/50">
        <div className="px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Manage tests and users</p>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs">Total Users</span>
              </div>
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-xs">Active Users</span>
              </div>
              <p className="text-2xl font-bold">{stats.activeUsers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <FileText className="w-4 h-4" />
                <span className="text-xs">Total Tests</span>
              </div>
              <p className="text-2xl font-bold">{stats.totalTests}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <BarChart3 className="w-4 h-4" />
                <span className="text-xs">Completions</span>
              </div>
              <p className="text-2xl font-bold">{stats.totalCompletions}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-2">
        <Tabs defaultValue="tests">
          <TabsList className="w-full">
            <TabsTrigger value="tests" className="flex-1">Tests</TabsTrigger>
            <TabsTrigger value="modules" className="flex-1">Modules</TabsTrigger>
            <TabsTrigger value="drugs" className="flex-1">Drugs</TabsTrigger>
            <TabsTrigger value="users" className="flex-1">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="tests" className="mt-4">
            <TestManager />
          </TabsContent>

          <TabsContent value="modules" className="mt-4">
            <ModuleManager />
          </TabsContent>

          <TabsContent value="drugs" className="mt-4">
            <DrugManager />
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">
                        {profile.display_name || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {profile.email || 'N/A'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(profile.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        No users yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
