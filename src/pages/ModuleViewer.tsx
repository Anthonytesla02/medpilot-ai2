import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2,
  Circle,
  SkipForward,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PageLoader } from '@/components/PageLoader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Subtopic {
  id: string;
  topic_id: string;
  title: string;
  content: string;
  order_index: number;
  is_completed?: boolean;
}

interface Topic {
  id: string;
  title: string;
  module_id: string;
}

export default function ModuleViewer() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [topic, setTopic] = useState<Topic | null>(null);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const topicId = location.state?.topicId;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (topicId && user) {
      fetchTopicContent();
    } else if (!topicId) {
      navigate('/tests');
    }
  }, [topicId, user]);

  const fetchTopicContent = async () => {
    try {
      // Fetch topic details
      const { data: topicData, error: topicError } = await supabase
        .from('course_topics')
        .select('id, title, module_id')
        .eq('id', topicId)
        .single();

      if (topicError) throw topicError;
      setTopic(topicData);

      // Fetch subtopics
      const { data: subtopicsData, error: subtopicsError } = await supabase
        .from('course_subtopics')
        .select('*')
        .eq('topic_id', topicId)
        .order('order_index');

      if (subtopicsError) throw subtopicsError;

      // Fetch user progress
      if (user && subtopicsData) {
        const subtopicIds = subtopicsData.map(s => s.id);
        const { data: progressData } = await supabase
          .from('user_module_progress')
          .select('subtopic_id, is_completed')
          .eq('user_id', user.id)
          .in('subtopic_id', subtopicIds);

        const progressMap = new Map(
          progressData?.map(p => [p.subtopic_id, p.is_completed]) || []
        );

        const subtopicsWithProgress = subtopicsData.map(s => ({
          ...s,
          is_completed: progressMap.get(s.id) || false
        }));

        setSubtopics(subtopicsWithProgress);
        
        // Find first incomplete subtopic to start from
        const firstIncompleteIndex = subtopicsWithProgress.findIndex(s => !s.is_completed);
        if (firstIncompleteIndex !== -1) {
          setCurrentIndex(firstIncompleteIndex);
        }
      } else {
        setSubtopics(subtopicsData || []);
      }
    } catch (error) {
      console.error('Error fetching topic content:', error);
      toast({
        title: 'Error',
        description: 'Failed to load content. Please try again.',
        variant: 'destructive'
      });
      navigate('/tests');
    } finally {
      setLoading(false);
    }
  };

  const markAsComplete = async (subtopicId: string) => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_module_progress')
        .upsert({
          user_id: user.id,
          subtopic_id: subtopicId,
          is_completed: true,
          completed_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,subtopic_id'
        });

      if (error) throw error;

      // Update local state
      setSubtopics(prev => prev.map(s => 
        s.id === subtopicId ? { ...s, is_completed: true } : s
      ));
    } catch (error) {
      console.error('Error marking complete:', error);
      toast({
        title: 'Error',
        description: 'Failed to save progress.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    const currentSubtopic = subtopics[currentIndex];
    
    // Mark current as complete if not already
    if (!currentSubtopic.is_completed) {
      await markAsComplete(currentSubtopic.id);
    }

    if (currentIndex < subtopics.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // All done, go back to tests
      toast({
        title: 'Topic Complete! 🎉',
        description: `You've finished "${topic?.title}"`,
      });
      navigate('/tests');
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    if (currentIndex < subtopics.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      navigate('/tests');
    }
  };

  const handleClose = () => {
    navigate('/tests');
  };

  if (authLoading || loading) {
    return <PageLoader />;
  }

  if (!topic || subtopics.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">No content available</p>
      </div>
    );
  }

  const currentSubtopic = subtopics[currentIndex];
  const progress = ((currentIndex + 1) / subtopics.length) * 100;
  const completedCount = subtopics.filter(s => s.is_completed).length;

  // Parse content for markdown-like formatting
  const formatContent = (content: string) => {
    return content
      .split('\n')
      .map((line, i) => {
        // Bold text
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Bullet points
        if (line.startsWith('• ')) {
          return `<li class="ml-4">${line.substring(2)}</li>`;
        }
        
        // Empty lines become breaks
        if (line.trim() === '') {
          return '<br/>';
        }
        
        return `<p class="mb-2">${line}</p>`;
      })
      .join('');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-border/50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <button onClick={handleClose} className="p-1">
              <X className="w-5 h-5" />
            </button>
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} of {subtopics.length}
            </span>
            <button onClick={handleSkip} className="text-sm text-primary flex items-center gap-1">
              Skip <SkipForward className="w-4 h-4" />
            </button>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSubtopic.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-4">
              <p className="text-xs text-primary font-medium uppercase tracking-wide mb-1">
                {topic.title}
              </p>
              <h1 className="text-xl font-bold">{currentSubtopic.title}</h1>
            </div>

            <Card className="mb-6">
              <CardContent className="pt-6">
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: formatContent(currentSubtopic.content) }}
                />
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Footer */}
      <div className="sticky bottom-0 glass border-t border-border/50 px-4 py-4 safe-bottom">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <Button
            className="flex-1"
            onClick={handleNext}
            disabled={saving}
          >
            {saving ? (
              'Saving...'
            ) : currentIndex === subtopics.length - 1 ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Complete Topic
              </>
            ) : currentSubtopic.is_completed ? (
              <>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Mark Complete & Next
              </>
            )}
          </Button>
        </div>

        {/* Progress Dots */}
        <div className="flex items-center justify-center gap-1.5 mt-4 overflow-x-auto py-1">
          {subtopics.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setCurrentIndex(i)}
              className={`w-2 h-2 rounded-full transition-all shrink-0 ${
                i === currentIndex 
                  ? 'w-4 bg-primary' 
                  : s.is_completed 
                    ? 'bg-green-500' 
                    : 'bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
