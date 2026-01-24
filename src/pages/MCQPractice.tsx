import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, Trophy, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PageLoader } from '@/components/PageLoader';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { mcqQuestions, MCQQuestion } from '@/data/mcqQuestions';
import { useToast } from '@/hooks/use-toast';

interface LocationState {
  testId?: string;
}

export default function MCQPractice() {
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [testId, setTestId] = useState<string>('default');
  const [testTitle, setTestTitle] = useState<string>('Pharmacy Practice MCQs');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const state = location.state as LocationState;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadTest();
    }
  }, [user, state?.testId]);

  const loadTest = async () => {
    setLoading(true);
    const requestedTestId = state?.testId || 'default';
    setTestId(requestedTestId);

    if (requestedTestId === 'default') {
      setQuestions(mcqQuestions);
      setTestTitle('Pharmacy Practice MCQs');
      setLoading(false);
      return;
    }

    // Load test from database
    const { data, error } = await supabase
      .from('tests')
      .select('*')
      .eq('id', requestedTestId)
      .single();

    if (error || !data) {
      toast({
        variant: 'destructive',
        title: 'Test not found',
        description: 'Loading default questions instead.',
      });
      setQuestions(mcqQuestions);
      setTestTitle('Pharmacy Practice MCQs');
      setTestId('default');
    } else {
      const testQuestions = Array.isArray(data.questions) ? data.questions : [];
      setQuestions(testQuestions as unknown as MCQQuestion[]);
      setTestTitle(data.title);
    }
    setLoading(false);
  };

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const handleAnswer = (letter: string) => {
    if (showResult) return;
    setSelectedAnswer(letter);
    setShowResult(true);
    
    if (letter === currentQuestion.correctAnswer) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setIsComplete(true);
      // Save result to database
      await saveResult();
    }
  };

  const saveResult = async () => {
    if (!user) return;

    const finalScore = score + (selectedAnswer === currentQuestion?.correctAnswer ? 1 : 0);
    const percentage = (finalScore / questions.length) * 100;
    
    const insertData: any = {
      user_id: user.id,
      score: finalScore,
      total_questions: questions.length,
      percentage: percentage,
    };
    
    // Only add test_id if it's not the default test
    if (testId !== 'default') {
      insertData.test_id = testId;
    }

    const { error } = await supabase.from('test_results').insert([insertData]);

    if (error) {
      console.error('Error saving result:', error);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setIsComplete(false);
  };

  if (authLoading || loading) {
    return <PageLoader />;
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <p className="text-muted-foreground mb-4">No questions available</p>
        <Button onClick={() => navigate('/tests')}>Back to Tests</Button>
      </div>
    );
  }

  if (isComplete) {
    const finalScore = score;
    const percentage = (finalScore / questions.length) * 100;
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="glass border-b border-border/50">
          <div className="px-4 py-4 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/tests')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold">Results</h1>
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6"
          >
            <Trophy className="w-12 h-12 text-primary" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold mb-2"
          >
            Test Complete!
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground mb-6 text-center"
          >
            {testTitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-8"
          >
            <p className="text-5xl font-bold text-primary mb-2">
              {percentage.toFixed(0)}%
            </p>
            <p className="text-muted-foreground">
              {finalScore} out of {questions.length} correct
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex gap-3 w-full max-w-xs"
          >
            <Button variant="outline" className="flex-1" onClick={handleRestart}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Retry
            </Button>
            <Button className="flex-1" onClick={() => navigate('/tests')}>
              Back to Tests
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="glass border-b border-border/50">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/tests')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-bold line-clamp-1">{testTitle}</h1>
              <p className="text-sm text-muted-foreground">
                Question {currentIndex + 1} of {questions.length}
              </p>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </header>

      {/* Question */}
      <div className="flex-1 px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            {currentQuestion.context && (
              <Card className="mb-4 bg-muted/50">
                <CardContent className="pt-4">
                  <p className="text-sm whitespace-pre-line">{currentQuestion.context}</p>
                </CardContent>
              </Card>
            )}

            <h2 className="text-lg font-semibold mb-6">{currentQuestion.question}</h2>

            <div className="space-y-3">
              {currentQuestion.options.map((option) => {
                const isSelected = selectedAnswer === option.letter;
                const isCorrect = option.letter === currentQuestion.correctAnswer;
                
                let buttonClass = "w-full p-4 rounded-xl border text-left transition-all ";
                
                if (showResult) {
                  if (isCorrect) {
                    buttonClass += "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400";
                  } else if (isSelected && !isCorrect) {
                    buttonClass += "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400";
                  } else {
                    buttonClass += "border-border/50 opacity-50";
                  }
                } else {
                  buttonClass += "border-border/50 hover:border-primary/50 hover:bg-primary/5";
                }

                return (
                  <motion.button
                    key={option.letter}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAnswer(option.letter)}
                    className={buttonClass}
                    disabled={showResult}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-background border flex items-center justify-center font-semibold text-sm">
                        {option.letter.toUpperCase()}
                      </span>
                      <span className="flex-1">{option.text}</span>
                      {showResult && isCorrect && (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                      {showResult && isSelected && !isCorrect && (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {showResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6"
              >
                <Card className={selectedAnswer === currentQuestion.correctAnswer 
                  ? "border-green-500/50 bg-green-500/5" 
                  : "border-red-500/50 bg-red-500/5"
                }>
                  <CardContent className="pt-4">
                    <p className={`text-sm ${
                      selectedAnswer === currentQuestion.correctAnswer 
                        ? "text-green-700 dark:text-green-400" 
                        : "text-red-700 dark:text-red-400"
                    }`}>
                      {selectedAnswer === currentQuestion.correctAnswer 
                        ? "Correct! " 
                        : "Incorrect. "}
                      {currentQuestion.explanation}
                    </p>
                  </CardContent>
                </Card>

                <Button 
                  className="w-full mt-4" 
                  onClick={handleNext}
                >
                  {currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
                </Button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
