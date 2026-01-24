import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  FileText, 
  BarChart3, 
  Upload, 
  ArrowLeft,
  Plus,
  Trash2,
  Eye,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { PageLoader } from '@/components/PageLoader';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { parseMarkdownQuestions } from '@/lib/parseMarkdownQuestions';
import { format } from 'date-fns';

interface Test {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  questions: any[];
  is_active: boolean;
  created_at: string;
}

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
  const [tests, setTests] = useState<Test[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalTests: 0,
    totalCompletions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTest, setNewTest] = useState({
    title: '',
    description: '',
    category: '',
    content: '',
  });

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
    }
  }, [user, authLoading, isAdmin, adminLoading, navigate]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchTests(), fetchUsers(), fetchStats()]);
    setLoading(false);
  };

  const fetchTests = async () => {
    const { data, error } = await supabase
      .from('tests')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTests(data.map(test => ({
        ...test,
        questions: Array.isArray(test.questions) ? test.questions : []
      })));
    }
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setNewTest(prev => ({ ...prev, content }));
    };
    reader.readAsText(file);
  };

  const handleCreateTest = async () => {
    if (!newTest.title || !newTest.content) {
      toast({
        variant: 'destructive',
        title: 'Missing fields',
        description: 'Please provide a title and upload questions.',
      });
      return;
    }

    setUploading(true);

    try {
      const questions = parseMarkdownQuestions(newTest.content);

      if (questions.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No questions found',
          description: 'Could not parse any questions from the uploaded file.',
        });
        setUploading(false);
        return;
      }

      const { error } = await supabase.from('tests').insert([{
        title: newTest.title,
        description: newTest.description || null,
        category: newTest.category || null,
        questions: questions as any,
        created_by: user!.id,
        is_active: true,
      }]);

      if (error) throw error;

      toast({
        title: 'Test created',
        description: `Successfully created test with ${questions.length} questions.`,
      });

      setNewTest({ title: '', description: '', category: '', content: '' });
      setShowCreateDialog(false);
      fetchTests();
      fetchStats();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error creating test',
        description: error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const toggleTestStatus = async (testId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('tests')
      .update({ is_active: !currentStatus })
      .eq('id', testId);

    if (!error) {
      fetchTests();
      toast({
        title: currentStatus ? 'Test deactivated' : 'Test activated',
      });
    }
  };

  const deleteTest = async (testId: string) => {
    if (!confirm('Are you sure you want to delete this test?')) return;

    const { error } = await supabase
      .from('tests')
      .delete()
      .eq('id', testId);

    if (!error) {
      fetchTests();
      fetchStats();
      toast({ title: 'Test deleted' });
    }
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
                <Users className="w-4 h-4 text-green-500" />
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
            <TabsTrigger value="users" className="flex-1">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="tests" className="mt-4 space-y-4">
            {/* Create Test Button */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Test
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Test</DialogTitle>
                  <DialogDescription>
                    Upload an MD file with MCQ questions to create a test.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium">Title *</label>
                    <Input
                      placeholder="Test title"
                      value={newTest.title}
                      onChange={(e) => setNewTest(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      placeholder="Optional description"
                      value={newTest.description}
                      onChange={(e) => setNewTest(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <Input
                      placeholder="e.g., Pharmacy, Medicine"
                      value={newTest.category}
                      onChange={(e) => setNewTest(prev => ({ ...prev, category: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Upload MD File *</label>
                    <div className="mt-2">
                      <Input
                        type="file"
                        accept=".md,.txt"
                        onChange={handleFileUpload}
                      />
                    </div>
                    {newTest.content && (
                      <p className="text-xs text-muted-foreground mt-1">
                        File loaded ({newTest.content.length} characters)
                      </p>
                    )}
                  </div>
                  <Button 
                    onClick={handleCreateTest} 
                    disabled={uploading}
                    className="w-full"
                  >
                    {uploading ? 'Creating...' : 'Create Test'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Tests List */}
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Questions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tests.map((test) => (
                    <TableRow key={test.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{test.title}</p>
                          {test.category && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              {test.category}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{test.questions.length}</TableCell>
                      <TableCell>
                        <Badge variant={test.is_active ? 'default' : 'secondary'}>
                          {test.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleTestStatus(test.id, test.is_active)}
                          >
                            {test.is_active ? (
                              <ToggleRight className="w-4 h-4 text-green-500" />
                            ) : (
                              <ToggleLeft className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteTest(test.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {tests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No tests created yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
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
                        No users found
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
