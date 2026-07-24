import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  ChevronRight, 
  CheckCircle2,
  Circle,
  Lock,
  Trophy
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Module {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
}

interface Topic {
  id: string;
  module_id: string;
  title: string;
  order_index: number;
  subtopics_count: number;
  completed_count: number;
}

interface ModuleQuizResult {
  module_id: string;
  passed: boolean;
  percentage: number;
}

export function ModulesSection() {
  const [modules, setModules] = useState<Module[]>([]);
  const [topics, setTopics] = useState<Map<string, Topic[]>>(new Map());
  const [quizResults, setQuizResults] = useState<Map<string, ModuleQuizResult>>(new Map());
  const [moduleHasQuestions, setModuleHasQuestions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchModules();
  }, [user]);

  const fetchModules = async () => {
    try {
      // Fetch modules
      const { data: modulesData, error: modulesError } = await supabase
        .from('course_modules')
        .select('*')
        .eq('is_active', true)
        .order('order_index');

      if (modulesError) throw modulesError;

      setModules(modulesData || []);

      // Check which modules have questions
      const { data: questionsData } = await supabase
        .from('module_questions')
        .select('module_id');

      const hasQuestions = new Set((questionsData || []).map(q => q.module_id));
      setModuleHasQuestions(hasQuestions);

      // Fetch user quiz results
      if (user) {
        const { data: resultsData } = await supabase
          .from('module_quiz_results')
          .select('module_id, passed, percentage')
          .eq('user_id', user.id);

        const resultsMap = new Map<string, ModuleQuizResult>();
        (resultsData || []).forEach(r => {
          resultsMap.set(r.module_id, r);
        });
        setQuizResults(resultsMap);
      }

      // Fetch topics with subtopic counts and progress
      if (modulesData && modulesData.length > 0) {
        const topicsMap = new Map<string, Topic[]>();

        for (const module of modulesData) {
          const { data: topicsData, error: topicsError } = await supabase
            .from('course_topics')
            .select(`
              id,
              module_id,
              title,
              order_index,
              course_subtopics(id)
            `)
            .eq('module_id', module.id)
            .order('order_index');

          if (topicsError) throw topicsError;

          // Get user progress for each topic's subtopics
          const topicsWithProgress: Topic[] = [];

          for (const topic of topicsData || []) {
            const subtopicIds = (topic.course_subtopics as { id: string }[])?.map(s => s.id) || [];
            let completedCount = 0;

            if (user && subtopicIds.length > 0) {
              const { data: progressData } = await supabase
                .from('user_module_progress')
                .select('subtopic_id')
                .eq('user_id', user.id)
                .eq('is_completed', true)
                .in('subtopic_id', subtopicIds);

              completedCount = progressData?.length || 0;
            }

            topicsWithProgress.push({
              id: topic.id,
              module_id: topic.module_id,
              title: topic.title,
              order_index: topic.order_index,
              subtopics_count: subtopicIds.length,
              completed_count: completedCount
            });
          }

          topicsMap.set(module.id, topicsWithProgress);
        }

        setTopics(topicsMap);
        
        // Auto-expand first unlocked module
        const firstUnlocked = modulesData.find((m, idx) => isModuleUnlocked(m.id, idx, modulesData));
        if (firstUnlocked) {
          setExpandedModule(firstUnlocked.id);
        } else if (modulesData.length > 0) {
          setExpandedModule(modulesData[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const isModuleUnlocked = (_moduleId: string, _moduleIndex: number, _modulesList: Module[] = modules): boolean => {
    // All modules are unlocked — users can freely explore any topic
    return true;
  };

  const getModuleProgress = (moduleId: string) => {
    const moduleTopics = topics.get(moduleId) || [];
    const totalSubtopics = moduleTopics.reduce((sum, t) => sum + t.subtopics_count, 0);
    const completedSubtopics = moduleTopics.reduce((sum, t) => sum + t.completed_count, 0);
    return totalSubtopics > 0 ? (completedSubtopics / totalSubtopics) * 100 : 0;
  };

  const handleTopicClick = (topicId: string, moduleId: string, moduleIndex: number) => {
    if (!isModuleUnlocked(moduleId, moduleIndex)) return;
    navigate('/module-viewer', { state: { topicId } });
  };

  const handleTakeQuiz = (moduleId: string) => {
    navigate('/module-quiz', { state: { moduleId } });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-4">
              <div className="h-6 bg-muted rounded w-3/4 mb-2" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No course modules available yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Check back soon for new learning content
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {modules.map((module, index) => {
        const moduleTopics = topics.get(module.id) || [];
        const progress = getModuleProgress(module.id);
        const isExpanded = expandedModule === module.id;
        const isUnlocked = isModuleUnlocked(module.id, index);
        const quizResult = quizResults.get(module.id);
        const hasQuiz = moduleHasQuestions.has(module.id);

        return (
          <motion.div
            key={module.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`overflow-hidden ${!isUnlocked ? 'opacity-75' : ''}`}>
              <CardContent className="pt-4 pb-2">
                {/* Module Header */}
                <div 
                  className={`${isUnlocked ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  onClick={() => isUnlocked && setExpandedModule(isExpanded ? null : module.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        !isUnlocked 
                          ? 'bg-muted' 
                          : quizResult?.passed 
                          ? 'bg-primary/10' 
                          : 'bg-primary/10'
                      }`}>
                        {!isUnlocked ? (
                          <Lock className="w-5 h-5 text-muted-foreground" />
                        ) : quizResult?.passed ? (
                          <Trophy className="w-5 h-5 text-primary" />
                        ) : (
                          <BookOpen className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm">{module.title}</h3>
                          {!isUnlocked && (
                            <Badge variant="secondary" className="text-xs">
                              Locked
                            </Badge>
                          )}
                          {quizResult?.passed && (
                            <Badge variant="default" className="text-xs">
                              Completed
                            </Badge>
                          )}
                        </div>
                        {module.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {module.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronRight 
                      className={`w-5 h-5 text-muted-foreground transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`} 
                    />
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="flex items-center gap-2 mt-3">
                    <Progress value={isUnlocked ? progress : 0} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground min-w-[3rem] text-right">
                      {isUnlocked ? `${progress.toFixed(0)}%` : '—'}
                    </span>
                  </div>
                </div>

                {/* Topics List */}
                {isExpanded && isUnlocked && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 space-y-2 border-t pt-4"
                  >
                    {moduleTopics.map((topic, topicIndex) => {
                      const isCompleted = topic.completed_count === topic.subtopics_count && topic.subtopics_count > 0;
                      const isStarted = topic.completed_count > 0;
                      
                      return (
                        <motion.div
                          key={topic.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: topicIndex * 0.05 }}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => handleTopicClick(topic.id, module.id, index)}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                          ) : isStarted ? (
                            <Circle className="w-5 h-5 text-primary shrink-0" />
                          ) : (
                            <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${
                              isCompleted ? 'text-muted-foreground' : ''
                            }`}>
                              {topic.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {topic.completed_count}/{topic.subtopics_count} completed
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        </motion.div>
                      );
                    })}

                    {/* Quiz Button */}
                    {hasQuiz && (
                      <div className="pt-3 border-t mt-3">
                        <Button
                          variant={quizResult?.passed ? 'outline' : 'default'}
                          className="w-full"
                          onClick={() => handleTakeQuiz(module.id)}
                        >
                          {quizResult?.passed ? (
                            <>
                              <Trophy className="w-4 h-4 mr-2" />
                              Retake Quiz ({quizResult.percentage.toFixed(0)}%)
                            </>
                          ) : quizResult ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Retry Quiz ({quizResult.percentage.toFixed(0)}%)
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Take Module Quiz
                            </>
                          )}
                        </Button>
                        {!quizResult?.passed && hasQuiz && index < modules.length - 1 && (
                          <p className="text-xs text-muted-foreground text-center mt-2">
                            Pass with 70% to unlock the next module
                          </p>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Locked Message */}
                {isExpanded && !isUnlocked && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 p-4 bg-muted/50 rounded-lg text-center"
                  >
                    <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Complete the previous module's quiz to unlock this content
                    </p>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
