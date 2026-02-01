import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Trophy, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PageLoader } from '@/components/PageLoader';

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface QuizState {
  currentIndex: number;
  answers: (number | null)[];
  showResult: boolean;
  selectedAnswer: number | null;
}

export default function ModuleQuizPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [moduleTitle, setModuleTitle] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [quizState, setQuizState] = useState<QuizState>({
    currentIndex: 0,
    answers: [],
    showResult: false,
    selectedAnswer: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0, percentage: 0 });

  const moduleId = location.state?.moduleId;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (moduleId && user) {
      fetchQuestions();
    } else if (!moduleId) {
      navigate('/tests');
    }
  }, [moduleId, user]);

  const fetchQuestions = async () => {
    try {
      // Get module info
      const { data: moduleData, error: moduleError } = await supabase
        .from('course_modules')
        .select('title')
        .eq('id', moduleId)
        .single();

      if (moduleError) throw moduleError;
      setModuleTitle(moduleData.title);

      // Get questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('module_questions')
        .select('questions')
        .eq('module_id', moduleId)
        .single();

      if (questionsError) throw questionsError;

      const rawQuestions = questionsData.questions;
      const parsedQuestions: Question[] = Array.isArray(rawQuestions) 
        ? (rawQuestions as unknown as Question[])
        : [];

      if (parsedQuestions.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No questions available',
          description: 'This module does not have any quiz questions yet.',
        });
        navigate('/tests');
        return;
      }

      setQuestions(parsedQuestions);
      setQuizState(prev => ({
        ...prev,
        answers: new Array(parsedQuestions.length).fill(null),
      }));
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({
        variant: 'destructive',
        title: 'Error loading quiz',
        description: 'Could not load the quiz. Please try again.',
      });
      navigate('/tests');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (answerIndex: number) => {
    if (quizState.showResult) return;
    setQuizState(prev => ({ ...prev, selectedAnswer: answerIndex }));
  };

  const handleConfirmAnswer = () => {
    if (quizState.selectedAnswer === null) return;

    const newAnswers = [...quizState.answers];
    newAnswers[quizState.currentIndex] = quizState.selectedAnswer;

    setQuizState(prev => ({
      ...prev,
      answers: newAnswers,
      showResult: true,
    }));
  };

  const handleNextQuestion = () => {
    if (quizState.currentIndex < questions.length - 1) {
      setQuizState(prev => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
        selectedAnswer: null,
        showResult: false,
      }));
    } else {
      // Calculate and submit score
      submitQuiz();
    }
  };

  const submitQuiz = async () => {
    setSubmitting(true);

    const correctCount = quizState.answers.reduce((count, answer, index) => {
      return count + (answer === questions[index].correctAnswer ? 1 : 0);
    }, 0);

    const percentage = (correctCount / questions.length) * 100;
    const passed = percentage >= 70; // 70% to pass

    setScore({
      correct: correctCount,
      total: questions.length,
      percentage,
    });

    try {
      // Upsert result (update if exists)
      const { error } = await supabase
        .from('module_quiz_results')
        .upsert({
          user_id: user!.id,
          module_id: moduleId,
          score: correctCount,
          total_questions: questions.length,
          percentage,
          passed,
          completed_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,module_id',
        });

      if (error) throw error;

      setCompleted(true);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast({
        variant: 'destructive',
        title: 'Error saving results',
        description: 'Your quiz results could not be saved. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setQuizState({
      currentIndex: 0,
      answers: new Array(questions.length).fill(null),
      showResult: false,
      selectedAnswer: null,
    });
    setCompleted(false);
  };

  if (authLoading || loading) {
    return <PageLoader />;
  }

  if (completed) {
    const passed = score.percentage >= 70;

    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="sticky top-0 z-30 glass border-b border-border/50">
          <div className="px-4 py-4 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/tests')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">Quiz Complete</h1>
              <p className="text-xs text-muted-foreground">{moduleTitle}</p>
            </div>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md"
          >
            <Card>
              <CardContent className="pt-6 text-center">
                <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
                  passed ? 'bg-primary/10' : 'bg-destructive/10'
                }`}>
                  {passed ? (
                    <Trophy className="w-10 h-10 text-primary" />
                  ) : (
                    <XCircle className="w-10 h-10 text-destructive" />
                  )}
                </div>

                <h2 className="text-2xl font-bold mb-2">
                  {passed ? 'Congratulations!' : 'Keep Trying!'}
                </h2>
                <p className="text-muted-foreground mb-4">
                  {passed 
                    ? 'You passed the quiz and unlocked the next module!'
                    : 'You need 70% to pass. Review the module and try again.'}
                </p>

                <div className="text-4xl font-bold mb-2">
                  {score.percentage.toFixed(0)}%
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  {score.correct} out of {score.total} correct
                </p>

                <div className="flex flex-col gap-2">
                  {!passed && (
                    <Button onClick={handleRetry} variant="default">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                  )}
                  <Button 
                    onClick={() => navigate('/tests')} 
                    variant={passed ? 'default' : 'outline'}
                  >
                    Back to Modules
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[quizState.currentIndex];
  const progress = ((quizState.currentIndex + 1) / questions.length) * 100;
  const isCorrect = quizState.selectedAnswer === currentQuestion.correctAnswer;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-border/50">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/tests')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-bold">{moduleTitle}</h1>
              <p className="text-xs text-muted-foreground">
                Question {quizState.currentIndex + 1} of {questions.length}
              </p>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </header>

      {/* Question */}
      <div className="flex-1 p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={quizState.currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <Card>
              <CardContent className="pt-6">
                <p className="text-lg font-medium">{currentQuestion.question}</p>
              </CardContent>
            </Card>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => {
                const isSelected = quizState.selectedAnswer === index;
                const isCorrectOption = index === currentQuestion.correctAnswer;
                const showCorrectness = quizState.showResult;

                let optionClass = 'border-border hover:border-primary/50';
                if (showCorrectness) {
                  if (isCorrectOption) {
                    optionClass = 'border-primary bg-primary/10';
                  } else if (isSelected && !isCorrectOption) {
                    optionClass = 'border-destructive bg-destructive/10';
                  }
                } else if (isSelected) {
                  optionClass = 'border-primary bg-primary/5';
                }

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card
                      className={`cursor-pointer transition-all ${optionClass}`}
                      onClick={() => handleSelectAnswer(index)}
                    >
                      <CardContent className="py-4 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          showCorrectness && isCorrectOption
                            ? 'bg-primary text-primary-foreground'
                            : showCorrectness && isSelected && !isCorrectOption
                            ? 'bg-destructive text-destructive-foreground'
                            : isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}>
                          {showCorrectness && isCorrectOption ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : showCorrectness && isSelected && !isCorrectOption ? (
                            <XCircle className="w-5 h-5" />
                          ) : (
                            String.fromCharCode(65 + index)
                          )}
                        </div>
                        <span className="flex-1">{option}</span>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* Explanation */}
            {quizState.showResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <Card className={isCorrect ? 'border-primary' : 'border-destructive'}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      {isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      ) : (
                        <XCircle className="w-5 h-5 text-destructive" />
                      )}
                      <span className="font-semibold">
                        {isCorrect ? 'Correct!' : 'Incorrect'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {currentQuestion.explanation}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Action Button */}
      <div className="p-4 border-t border-border glass">
        {!quizState.showResult ? (
          <Button 
            className="w-full" 
            onClick={handleConfirmAnswer}
            disabled={quizState.selectedAnswer === null}
          >
            Check Answer
          </Button>
        ) : (
          <Button 
            className="w-full" 
            onClick={handleNextQuestion}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : quizState.currentIndex < questions.length - 1 ? (
              'Next Question'
            ) : (
              'Finish Quiz'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
