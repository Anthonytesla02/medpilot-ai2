import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardList, 
  Clock, 
  CheckCircle2, 
  Trophy,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { BottomNav } from '@/components/BottomNav';
import { PageLoader } from '@/components/PageLoader';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { mcqQuestions } from '@/data/mcqQuestions';

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
      // Get best score for each test
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

  const handleStartTest = (testId: string) => {
    navigate('/mcq-practice', { state: { testId } });
  };

  const handleStartDefaultTest = () => {
    navigate('/mcq-practice', { state: { testId: 'default' } });
  };

  if (authLoading || loading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-border/50">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold">Practice Tests</h1>
          <p className="text-sm text-muted-foreground">Test your pharmacy knowledge</p>
        </div>
      </header>

      {/* Tests List */}
      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Default MCQ Test */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card 
            className="cursor-pointer hover:border-primary/30 transition-colors"
            onClick={handleStartDefaultTest}
          >
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Pharmacy Practice MCQs</h3>
                      <p className="text-xs text-muted-foreground">General pharmacy knowledge</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ClipboardList className="w-4 h-4" />
                      {mcqQuestions.length} questions
                    </span>
                    {results.get('default') && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <Trophy className="w-3 h-3 mr-1" />
                        Best: {results.get('default')?.percentage.toFixed(0)}%
                      </Badge>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Dynamic Tests */}
        {tests.map((test, index) => {
          const testResult = results.get(test.id);
          const isCompleted = !!testResult;

          return (
            <motion.div
              key={test.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (index + 1) * 0.1 }}
            >
              <Card 
                className="cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => handleStartTest(test.id)}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isCompleted ? 'bg-green-500/10' : 'bg-primary/10'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <ClipboardList className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold">{test.title}</h3>
                          {test.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {test.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ClipboardList className="w-4 h-4" />
                          {test.questions.length} questions
                        </span>
                        {test.category && (
                          <Badge variant="secondary" className="text-xs">
                            {test.category}
                          </Badge>
                        )}
                        {testResult && (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <Trophy className="w-3 h-3 mr-1" />
                            Best: {testResult.percentage.toFixed(0)}%
                          </Badge>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        {tests.length === 0 && (
          <div className="text-center py-12">
            <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">More tests coming soon!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Start with the Pharmacy Practice MCQs above
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
