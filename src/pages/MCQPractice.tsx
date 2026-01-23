import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, RotateCcw, Trophy, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BottomNav } from '@/components/BottomNav';
import { mcqQuestions, MCQQuestion } from '@/data/mcqQuestions';
import { useAuth } from '@/hooks/useAuth';

export default function MCQPractice() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const currentQuestion: MCQQuestion = mcqQuestions[currentIndex];
  const progress = ((currentIndex + 1) / mcqQuestions.length) * 100;
  const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

  const handleAnswerSelect = (letter: string) => {
    if (showResult) return;
    setSelectedAnswer(letter);
    setShowResult(true);
    setAnsweredQuestions(prev => prev + 1);
    if (letter === currentQuestion.correctAnswer) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < mcqQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setQuizComplete(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setAnsweredQuestions(0);
    setQuizComplete(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  const getOptionStyle = (letter: string) => {
    if (!showResult) {
      return selectedAnswer === letter
        ? 'border-primary bg-primary/10'
        : 'border-border hover:border-primary/50 hover:bg-accent';
    }
    
    if (letter === currentQuestion.correctAnswer) {
      return 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400';
    }
    
    if (letter === selectedAnswer && !isCorrect) {
      return 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400';
    }
    
    return 'border-border opacity-50';
  };

  if (quizComplete) {
    const percentage = Math.round((score / mcqQuestions.length) * 100);
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-40 glass border-b border-border/50">
          <div className="flex items-center justify-between p-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">Quiz Complete</h1>
            <div className="w-10" />
          </div>
        </header>

        <div className="p-4 max-w-lg mx-auto">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-8"
          >
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Trophy className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Well Done!</h2>
            <p className="text-muted-foreground mb-6">You've completed the MCQ practice</p>

            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="text-5xl font-bold text-primary mb-2">{percentage}%</div>
                <p className="text-muted-foreground">
                  {score} out of {mcqQuestions.length} correct
                </p>
                <Progress value={percentage} className="mt-4" />
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => navigate('/profile')}>
                Back to Profile
              </Button>
              <Button className="flex-1" onClick={handleRestart}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </motion.div>
        </div>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 glass border-b border-border/50">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">MCQ Practice</h1>
          <Badge variant="secondary">
            {score}/{answeredQuestions}
          </Badge>
        </div>
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Question {currentIndex + 1} of {mcqQuestions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </header>

      <div className="p-4 max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {currentQuestion.context && (
              <Card className="mb-4 bg-muted/50">
                <CardContent className="p-4">
                  <p className="text-sm font-mono whitespace-pre-line">{currentQuestion.context}</p>
                </CardContent>
              </Card>
            )}

            <h2 className="text-lg font-medium mb-6">{currentQuestion.question}</h2>

            <div className="space-y-3">
              {currentQuestion.options.map((option) => (
                <motion.button
                  key={option.letter}
                  whileTap={{ scale: showResult ? 1 : 0.98 }}
                  onClick={() => handleAnswerSelect(option.letter)}
                  disabled={showResult}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${getOptionStyle(option.letter)}`}
                >
                  <span className="w-8 h-8 rounded-full bg-background border-2 border-current flex items-center justify-center text-sm font-bold uppercase">
                    {option.letter}
                  </span>
                  <span className="flex-1">{option.text}</span>
                  {showResult && option.letter === currentQuestion.correctAnswer && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {showResult && option.letter === selectedAnswer && !isCorrect && (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </motion.button>
              ))}
            </div>

            <AnimatePresence>
              {showResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-6"
                >
                  <Card className={isCorrect ? 'border-green-500/50 bg-green-500/5' : 'border-red-500/50 bg-red-500/5'}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {isCorrect ? (
                          <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                        )}
                        <div>
                          <p className={`font-medium ${isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                            {isCorrect ? 'Correct!' : 'Incorrect'}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {currentQuestion.explanation}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Button className="w-full mt-4" onClick={handleNext}>
                    {currentIndex < mcqQuestions.length - 1 ? (
                      <>
                        Next Question
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </>
                    ) : (
                      <>
                        See Results
                        <Trophy className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  );
}
