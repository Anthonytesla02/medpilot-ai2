import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Target, 
  Calendar, 
  BarChart3,
  BookOpen,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay } from 'date-fns';

interface TestResult {
  completed_at: string;
  percentage: number;
  score: number;
  total_questions: number;
}

interface ModuleQuizResult {
  completed_at: string;
  percentage: number;
  passed: boolean;
  module_id: string;
}

interface UserAnalyticsProps {
  userId: string;
}

export function UserAnalytics({ userId }: UserAnalyticsProps) {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [moduleResults, setModuleResults] = useState<ModuleQuizResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchAnalytics();
    }
  }, [userId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    
    const [testsRes, modulesRes] = await Promise.all([
      supabase
        .from('test_results')
        .select('completed_at, percentage, score, total_questions')
        .eq('user_id', userId)
        .order('completed_at', { ascending: true }),
      supabase
        .from('module_quiz_results')
        .select('completed_at, percentage, passed, module_id')
        .eq('user_id', userId)
        .order('completed_at', { ascending: true })
    ]);

    if (testsRes.data) setTestResults(testsRes.data);
    if (modulesRes.data) setModuleResults(modulesRes.data);
    setLoading(false);
  };

  // Prepare performance over time data (last 30 days)
  const getPerformanceData = () => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = startOfDay(subDays(new Date(), 29 - i));
      return {
        date: format(date, 'MMM dd'),
        dateKey: format(date, 'yyyy-MM-dd'),
        tests: 0,
        avgScore: 0,
        count: 0
      };
    });

    testResults.forEach(result => {
      const dateKey = format(new Date(result.completed_at), 'yyyy-MM-dd');
      const day = last30Days.find(d => d.dateKey === dateKey);
      if (day) {
        day.tests += 1;
        day.avgScore = ((day.avgScore * day.count) + result.percentage) / (day.count + 1);
        day.count += 1;
      }
    });

    return last30Days.map(d => ({
      date: d.date,
      score: Math.round(d.avgScore),
      tests: d.tests
    }));
  };

  // Calculate summary stats
  const getSummaryStats = () => {
    const totalTests = testResults.length;
    const avgScore = totalTests > 0 
      ? testResults.reduce((acc, r) => acc + r.percentage, 0) / totalTests 
      : 0;
    const bestScore = totalTests > 0 
      ? Math.max(...testResults.map(r => r.percentage)) 
      : 0;
    const modulesCompleted = moduleResults.filter(m => m.passed).length;
    const totalQuestions = testResults.reduce((acc, r) => acc + r.total_questions, 0);
    const correctAnswers = testResults.reduce((acc, r) => acc + r.score, 0);

    return {
      totalTests,
      avgScore,
      bestScore,
      modulesCompleted,
      totalQuestions,
      correctAnswers,
      accuracy: totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0
    };
  };

  const performanceData = getPerformanceData();
  const stats = getSummaryStats();

  const chartConfig = {
    score: {
      label: "Score",
      color: "hsl(var(--primary))",
    },
    tests: {
      label: "Tests",
      color: "hsl(var(--chart-2))",
    },
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-48 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <h2 className="text-sm font-medium text-muted-foreground px-1">Your Analytics</h2>
      
      {/* Summary Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-card border-border/50">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Accuracy</span>
            </div>
            <p className="text-2xl font-bold">{stats.accuracy.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">
              {stats.correctAnswers}/{stats.totalQuestions} correct
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Best Score</span>
            </div>
            <p className="text-2xl font-bold">{stats.bestScore.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">
              Avg: {stats.avgScore.toFixed(0)}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Tests Taken</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalTests}</p>
            <p className="text-xs text-muted-foreground">
              practice tests
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Modules</span>
            </div>
            <p className="text-2xl font-bold">{stats.modulesCompleted}</p>
            <p className="text-xs text-muted-foreground">
              completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      {stats.totalTests > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              Performance Over Time (30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <ChartContainer config={chartConfig} className="h-[180px] w-full">
              <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  stroke="hsl(var(--primary))" 
                  fillOpacity={1} 
                  fill="url(#colorScore)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {testResults.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recent Tests</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="space-y-2">
              {testResults.slice(-5).reverse().map((result, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2">
                    {result.percentage >= 70 ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-sm">
                      {format(new Date(result.completed_at), 'MMM dd, yyyy')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-semibold ${result.percentage >= 70 ? 'text-green-500' : 'text-red-500'}`}>
                      {result.percentage.toFixed(0)}%
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({result.score}/{result.total_questions})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {stats.totalTests === 0 && moduleResults.length === 0 && (
        <Card className="bg-card border-border/50">
          <CardContent className="py-8 text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No test data yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Take some tests to see your analytics here
            </p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
