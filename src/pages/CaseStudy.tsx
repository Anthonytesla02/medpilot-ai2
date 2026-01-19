import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Send, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Sparkles,
  Trophy,
  Target,
  Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BottomNav } from '@/components/BottomNav';
import { PageLoader } from '@/components/PageLoader';
import { UpgradeModal } from '@/components/UpgradeModal';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CaseStudyData {
  id: string;
  illness: string;
  caseStudy: string;
  correctDiagnosis: string;
  correctTreatment: string;
  difficulty: 'easy' | 'medium' | 'hard';
  keyClues: string[];
}

interface GradeResult {
  diagnosisScore: number;
  diagnosisCorrect: boolean;
  diagnosisFeedback: string;
  treatmentScore: number;
  treatmentCorrect: boolean;
  treatmentFeedback: string;
  overallScore: number;
  overallFeedback: string;
  correctDiagnosis: string;
  correctTreatment: string;
}

export default function CaseStudy() {
  const [caseData, setCaseData] = useState<CaseStudyData | null>(null);
  const [userDiagnosis, setUserDiagnosis] = useState('');
  const [userTreatment, setUserTreatment] = useState('');
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [grading, setGrading] = useState(false);
  const [casesCompleted, setCasesCompleted] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const { user, loading: authLoading } = useAuth();
  const { limits, usage, loading: subLoading, incrementUsage } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const generateNewCase = async () => {
    // Check if user can generate case studies
    if (!limits?.canUseCaseStudy) {
      setShowUpgradeModal(true);
      return;
    }

    setLoading(true);
    setCaseData(null);
    setGradeResult(null);
    setUserDiagnosis('');
    setUserTreatment('');

    // Increment usage for trial users
    if (!limits?.isSubscribed) {
      await incrementUsage('case_study');
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-case-study`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate case study');
      }

      const data = await response.json();
      setCaseData(data);
    } catch (error) {
      console.error('Error generating case:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate case study. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const submitAnswers = async () => {
    if (!caseData || (!userDiagnosis.trim() && !userTreatment.trim())) {
      toast({
        title: 'Please provide answers',
        description: 'Enter at least one answer before submitting.',
        variant: 'destructive',
      });
      return;
    }

    setGrading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/grade-case-study`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            correctDiagnosis: caseData.correctDiagnosis,
            correctTreatment: caseData.correctTreatment,
            userDiagnosis: userDiagnosis.trim(),
            userTreatment: userTreatment.trim(),
            illness: caseData.illness,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to grade answers');
      }

      const result = await response.json();
      setGradeResult(result);
      setCasesCompleted(prev => prev + 1);
      setTotalScore(prev => prev + result.overallScore);
    } catch (error) {
      console.error('Error grading:', error);
      toast({
        title: 'Error',
        description: 'Failed to grade answers. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setGrading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500/20 text-green-600 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30';
      case 'hard': return 'bg-red-500/20 text-red-600 border-red-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (authLoading || subLoading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20">
      <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} triggerType="case_study" />

      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-border/50">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Case Studies
            </h1>
            <div className="flex items-center gap-2">
              {!limits?.isSubscribed && usage && (
                <Badge variant="outline" className="text-xs">
                  <Crown className="w-3 h-3 mr-1" />
                  {usage.caseStudiesUsed}/{usage.caseStudiesLimit}
                </Badge>
              )}
              {casesCompleted > 0 && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Trophy className="w-3 h-3" />
                  Avg: {Math.round(totalScore / casesCompleted)}%
                </Badge>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Practice with AI-generated clinical scenarios from Ghana STG
          </p>
        </div>
      </header>

      <ScrollArea className="flex-1 px-4 py-4">
        <AnimatePresence mode="wait">
          {!caseData && !loading && (
            <motion.div
              key="start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Ready to Practice?</h2>
              <p className="text-muted-foreground mb-6 max-w-sm">
                Generate a case study based on real clinical scenarios from the Ghana Standard Treatment Guidelines.
              </p>
              <Button 
                onClick={generateNewCase} 
                size="lg" 
                className="rounded-xl gap-2"
              >
                <Target className="w-5 h-5" />
                Generate Case Study
              </Button>
            </motion.div>
          )}

          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <div className="relative">
                <div className="w-16 h-16 border-4 border-primary/20 rounded-full" />
                <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-primary rounded-full animate-spin" />
              </div>
              <p className="mt-4 text-muted-foreground">Generating case study...</p>
            </motion.div>
          )}

          {caseData && !gradeResult && (
            <motion.div
              key="case"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">Clinical Case</CardTitle>
                    <Badge className={cn("capitalize", getDifficultyColor(caseData.difficulty))}>
                      {caseData.difficulty}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                    {caseData.caseStudy}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</span>
                    What's the diagnosis?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Enter your diagnosis..."
                    value={userDiagnosis}
                    onChange={(e) => setUserDiagnosis(e.target.value)}
                    className="min-h-[80px] resize-none"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</span>
                    What's the treatment?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Enter the treatment protocol (drugs, dosages, duration)..."
                    value={userTreatment}
                    onChange={(e) => setUserTreatment(e.target.value)}
                    className="min-h-[120px] resize-none"
                  />
                </CardContent>
              </Card>

              <Button 
                onClick={submitAnswers} 
                disabled={grading}
                className="w-full rounded-xl gap-2"
                size="lg"
              >
                {grading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Grading...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Answers
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {gradeResult && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Overall Score */}
              <Card className="border-2 border-primary/20">
                <CardContent className="pt-6">
                  <div className="text-center mb-4">
                    <div className={cn("text-5xl font-bold mb-2", getScoreColor(gradeResult.overallScore))}>
                      {gradeResult.overallScore}%
                    </div>
                    <p className="text-muted-foreground">{gradeResult.overallFeedback}</p>
                  </div>
                  <Progress value={gradeResult.overallScore} className="h-2" />
                </CardContent>
              </Card>

              {/* Diagnosis Result */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {gradeResult.diagnosisCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    Diagnosis
                    <Badge variant="outline" className={getScoreColor(gradeResult.diagnosisScore)}>
                      {gradeResult.diagnosisScore}%
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Your answer:</p>
                    <p className="text-foreground">{userDiagnosis || "(No answer)"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Correct answer:</p>
                    <p className="text-foreground font-medium">{gradeResult.correctDiagnosis}</p>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                    <AlertCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{gradeResult.diagnosisFeedback}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Treatment Result */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {gradeResult.treatmentCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    Treatment
                    <Badge variant="outline" className={getScoreColor(gradeResult.treatmentScore)}>
                      {gradeResult.treatmentScore}%
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Your answer:</p>
                    <p className="text-foreground whitespace-pre-wrap">{userTreatment || "(No answer)"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Correct answer:</p>
                    <p className="text-foreground font-medium whitespace-pre-wrap">{gradeResult.correctTreatment}</p>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                    <AlertCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{gradeResult.treatmentFeedback}</p>
                  </div>
                </CardContent>
              </Card>

              <Button 
                onClick={generateNewCase} 
                className="w-full rounded-xl gap-2"
                size="lg"
              >
                <RefreshCw className="w-4 h-4" />
                Try Another Case
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </ScrollArea>

      <BottomNav />
    </div>
  );
}
