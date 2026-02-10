import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Pill, Trophy, RotateCcw, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PageLoader } from '@/components/PageLoader';
import { BottomNav } from '@/components/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DrugBrand {
  id: string;
  brand_name: string;
  active_ingredient: string;
  category: string;
}

interface PracticeResult {
  category: string;
  percentage: number;
}

type View = 'categories' | 'quiz' | 'results';

export default function DrugPractice() {
  const [drugs, setDrugs] = useState<DrugBrand[]>([]);
  const [bestResults, setBestResults] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('categories');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Quiz state
  const [quizDrugs, setQuizDrugs] = useState<DrugBrand[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const [drugsRes, resultsRes] = await Promise.all([
      supabase.from('drug_brands').select('*').order('brand_name'),
      user ? supabase.from('drug_practice_results').select('category, percentage').eq('user_id', user.id) : Promise.resolve({ data: [] }),
    ]);

    if (drugsRes.data) setDrugs(drugsRes.data);

    if (resultsRes.data) {
      const best = new Map<string, number>();
      (resultsRes.data as PracticeResult[]).forEach(r => {
        const existing = best.get(r.category);
        if (!existing || r.percentage > existing) best.set(r.category, r.percentage);
      });
      setBestResults(best);
    }
    setLoading(false);
  };

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    drugs.forEach(d => map.set(d.category, (map.get(d.category) || 0) + 1));
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [drugs]);

  const generateOptions = (correctIngredient: string, allDrugs: DrugBrand[]) => {
    const uniqueIngredients = [...new Set(allDrugs.map(d => d.active_ingredient))].filter(i => i !== correctIngredient);
    const shuffled = uniqueIngredients.sort(() => Math.random() - 0.5);
    const wrongOptions = shuffled.slice(0, 3);
    const allOptions = [...wrongOptions, correctIngredient].sort(() => Math.random() - 0.5);
    return allOptions;
  };

  const startQuiz = (cat: string) => {
    const categoryDrugs = drugs.filter(d => d.category === cat);
    const shuffled = [...categoryDrugs].sort(() => Math.random() - 0.5);
    setSelectedCategory(cat);
    setQuizDrugs(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setOptions(generateOptions(shuffled[0].active_ingredient, drugs));
    setView('quiz');
  };

  const handleAnswer = (answer: string) => {
    if (showResult) return;
    setSelectedAnswer(answer);
    setShowResult(true);
    if (answer === quizDrugs[currentIndex].active_ingredient) {
      setScore(s => s + 1);
    }
  };

  const handleNext = async () => {
    if (currentIndex < quizDrugs.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setSelectedAnswer(null);
      setShowResult(false);
      setOptions(generateOptions(quizDrugs[nextIndex].active_ingredient, drugs));
    } else {
      // Save result
      const finalScore = score + (selectedAnswer === quizDrugs[currentIndex].active_ingredient ? 0 : 0);
      // score already updated in handleAnswer
      const percentage = (score / quizDrugs.length) * 100;
      if (user) {
        await supabase.from('drug_practice_results').insert([{
          user_id: user.id,
          category: selectedCategory,
          score,
          total_questions: quizDrugs.length,
          percentage,
        }]);
      }
      setView('results');
    }
  };

  const currentDrug = quizDrugs[currentIndex];
  const progress = quizDrugs.length > 0 ? ((currentIndex + 1) / quizDrugs.length) * 100 : 0;

  if (authLoading || loading) return <PageLoader />;

  // Categories view
  if (view === 'categories') {
    return (
      <div className="min-h-screen flex flex-col bg-background pb-20">
        <header className="sticky top-0 z-30 glass border-b border-border/50">
          <div className="px-4 py-4">
            <h1 className="text-xl font-bold">Drug Brands Practice</h1>
            <p className="text-sm text-muted-foreground">Learn brand names & active ingredients</p>
          </div>
        </header>

        <div className="flex-1 px-4 py-4 space-y-3">
          {categories.length === 0 ? (
            <div className="text-center py-12">
              <Pill className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No drugs available yet</p>
              <p className="text-sm text-muted-foreground mt-1">Check back later!</p>
            </div>
          ) : (
            categories.map(([cat, count], index) => {
              const best = bestResults.get(cat);
              return (
                <motion.div
                  key={cat}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className="cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => startQuiz(cat)}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${best ? 'bg-green-500/10' : 'bg-primary/10'}`}>
                            <Pill className={`w-5 h-5 ${best ? 'text-green-500' : 'text-primary'}`} />
                          </div>
                          <div>
                            <h3 className="font-semibold">{cat}</h3>
                            <p className="text-xs text-muted-foreground">{count} drugs</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {best !== undefined && (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              <Trophy className="w-3 h-3 mr-1" />
                              {best.toFixed(0)}%
                            </Badge>
                          )}
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>

        <BottomNav />
      </div>
    );
  }

  // Results view
  if (view === 'results') {
    const percentage = (score / quizDrugs.length) * 100;
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="glass border-b border-border/50">
          <div className="px-4 py-4 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { setView('categories'); fetchData(); }}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold">Results</h1>
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Trophy className="w-12 h-12 text-primary" />
          </motion.div>
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold mb-2">
            Practice Complete!
          </motion.h2>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-muted-foreground mb-6">
            {selectedCategory}
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-center mb-8">
            <p className="text-5xl font-bold text-primary mb-2">{percentage.toFixed(0)}%</p>
            <p className="text-muted-foreground">{score} out of {quizDrugs.length} correct</p>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex gap-3 w-full max-w-xs">
            <Button variant="outline" className="flex-1" onClick={() => startQuiz(selectedCategory)}>
              <RotateCcw className="w-4 h-4 mr-2" /> Retry
            </Button>
            <Button className="flex-1" onClick={() => { setView('categories'); fetchData(); }}>
              Categories
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Quiz view
  if (!currentDrug) return <PageLoader />;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="glass border-b border-border/50">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="icon" onClick={() => setView('categories')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-bold">{selectedCategory}</h1>
              <p className="text-sm text-muted-foreground">Drug {currentIndex + 1} of {quizDrugs.length}</p>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </header>

      <div className="flex-1 px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div key={currentIndex} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <div className="text-center mb-8">
              <p className="text-sm text-muted-foreground mb-2">What is the active ingredient of:</p>
              <h2 className="text-2xl font-bold text-primary">{currentDrug.brand_name}</h2>
            </div>

            <div className="space-y-3">
              {options.map((opt, i) => {
                const isSelected = selectedAnswer === opt;
                const isCorrect = opt === currentDrug.active_ingredient;

                let cls = "w-full p-4 rounded-xl border text-left transition-all ";
                if (showResult) {
                  if (isCorrect) cls += "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400";
                  else if (isSelected && !isCorrect) cls += "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400";
                  else cls += "border-border/50 opacity-50";
                } else {
                  cls += "border-border/50 hover:border-primary/50 hover:bg-primary/5";
                }

                return (
                  <motion.button key={opt + i} whileTap={{ scale: 0.98 }} onClick={() => handleAnswer(opt)} className={cls} disabled={showResult}>
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-background border flex items-center justify-center font-semibold text-sm">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="flex-1">{opt}</span>
                      {showResult && isCorrect && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                      {showResult && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-500" />}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {showResult && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
                <Card className={selectedAnswer === currentDrug.active_ingredient ? "border-green-500/50 bg-green-500/5" : "border-red-500/50 bg-red-500/5"}>
                  <CardContent className="pt-4">
                    <p className={`text-sm ${selectedAnswer === currentDrug.active_ingredient ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                      {selectedAnswer === currentDrug.active_ingredient ? "Correct! " : `Incorrect. The answer is ${currentDrug.active_ingredient}. `}
                      <span className="font-medium">{currentDrug.brand_name}</span> contains <span className="font-medium">{currentDrug.active_ingredient}</span>.
                    </p>
                  </CardContent>
                </Card>
                <Button className="w-full mt-4" onClick={handleNext}>
                  {currentIndex < quizDrugs.length - 1 ? 'Next Drug' : 'See Results'}
                </Button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
