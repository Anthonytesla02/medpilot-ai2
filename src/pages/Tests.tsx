import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BottomNav } from '@/components/BottomNav';
import { PageLoader } from '@/components/PageLoader';
import { PracticeSection } from '@/components/tests/PracticeSection';
import { ModulesSection } from '@/components/tests/ModulesSection';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Test {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  questions: any[];
  created_at: string;
}

interface TestResult {
  test_id: string;
  score: number;
  total_questions: number;
  percentage: number;
}

export default function TestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [results, setResults] = useState<Map<string, TestResult>>(new Map());
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchTests();
      fetchResults();
    }
  }, [user]);

  const fetchTests = async () => {
    const { data, error } = await supabase
      .from('tests')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTests(data.map(test => ({
        ...test,
        questions: Array.isArray(test.questions) ? test.questions : []
      })));
    }
    setLoading(false);
  };

  const fetchResults = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('test_results')
      .select('test_id, score, total_questions, percentage')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false });

    if (!error && data) {
      const bestResults = new Map<string, TestResult>();
      data.forEach(result => {
        const existing = bestResults.get(result.test_id);
        if (!existing || result.percentage > existing.percentage) {
          bestResults.set(result.test_id, result);
        }
      });
      setResults(bestResults);
    }
  };

  if (authLoading || loading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-border/50">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold">Learning</h1>
          <p className="text-sm text-muted-foreground">Practice tests & course modules</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex-1 px-4 py-4">
        <Tabs defaultValue="modules" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="modules">Modules</TabsTrigger>
            <TabsTrigger value="practice">Practice</TabsTrigger>
          </TabsList>
          
          <TabsContent value="modules" className="mt-0">
            <ModulesSection />
          </TabsContent>
          
          <TabsContent value="practice" className="mt-0">
            <PracticeSection tests={tests} results={results} />
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
}