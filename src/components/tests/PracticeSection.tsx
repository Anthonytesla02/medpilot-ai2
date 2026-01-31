import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardList, 
  CheckCircle2, 
  Trophy,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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

interface PracticeSectionProps {
  tests: Test[];
  results: Map<string, TestResult>;
}

export function PracticeSection({ tests, results }: PracticeSectionProps) {
  const navigate = useNavigate();

  const handleStartTest = (testId: string) => {
    navigate('/mcq-practice', { state: { testId } });
  };

  const handleStartDefaultTest = () => {
    navigate('/mcq-practice', { state: { testId: 'default' } });
  };

  return (
    <div className="space-y-4">
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
  );
}
