import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  ChevronRight, 
  CheckCircle2,
  Circle,
  Lock
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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

export function ModulesSection() {
  const [modules, setModules] = useState<Module[]>([]);
  const [topics, setTopics] = useState<Map<string, Topic[]>>(new Map());
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
            const subtopicIds = (topic.course_subtopics as any[])?.map(s => s.id) || [];
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
        
        // Auto-expand first module
        if (modulesData.length > 0) {
          setExpandedModule(modulesData[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const getModuleProgress = (moduleId: string) => {
    const moduleTopics = topics.get(moduleId) || [];
    const totalSubtopics = moduleTopics.reduce((sum, t) => sum + t.subtopics_count, 0);
    const completedSubtopics = moduleTopics.reduce((sum, t) => sum + t.completed_count, 0);
    return totalSubtopics > 0 ? (completedSubtopics / totalSubtopics) * 100 : 0;
  };

  const handleTopicClick = (topicId: string) => {
    navigate('/module-viewer', { state: { topicId } });
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

        return (
          <motion.div
            key={module.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="overflow-hidden">
              <CardContent className="pt-4 pb-2">
                {/* Module Header */}
                <div 
                  className="cursor-pointer"
                  onClick={() => setExpandedModule(isExpanded ? null : module.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{module.title}</h3>
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
                    <Progress value={progress} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground min-w-[3rem] text-right">
                      {progress.toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Topics List */}
                {isExpanded && (
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
                          onClick={() => handleTopicClick(topic.id)}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
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
