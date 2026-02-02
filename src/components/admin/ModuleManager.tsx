import { useState, useEffect } from 'react';
import { Plus, Upload, Trash2, BookOpen, Loader2, ChevronUp, ChevronDown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Subtopic {
  id: string;
  title: string;
  content: string;
  order_index: number;
}

interface Topic {
  id: string;
  title: string;
  order_index: number;
  subtopics: Subtopic[];
}

interface Module {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
  topics: Topic[];
  has_questions: boolean;
  questions_count: number;
}

export function ModuleManager() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [moduleTitle, setModuleTitle] = useState('');
  const [generatingQuestions, setGeneratingQuestions] = useState<string | null>(null);
  const [reordering, setReordering] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    setLoading(true);
    
    // Fetch modules with topics and subtopics
    const { data: modulesData, error: modulesError } = await supabase
      .from('course_modules')
      .select('*')
      .order('order_index', { ascending: true });

    if (modulesError) {
      console.error('Error fetching modules:', modulesError);
      setLoading(false);
      return;
    }

    // Fetch module questions to check which modules have them
    const { data: questionsData } = await supabase
      .from('module_questions')
      .select('module_id, questions');

    const questionsMap = new Map<string, number>();
    (questionsData || []).forEach(q => {
      const questions = Array.isArray(q.questions) ? q.questions : [];
      questionsMap.set(q.module_id, questions.length);
    });

    // Fetch topics for each module
    const modulesWithTopics: Module[] = [];
    
    for (const mod of modulesData || []) {
      const { data: topicsData } = await supabase
        .from('course_topics')
        .select('*')
        .eq('module_id', mod.id)
        .order('order_index', { ascending: true });

      const topicsWithSubtopics: Topic[] = [];
      
      for (const topic of topicsData || []) {
        const { data: subtopicsData } = await supabase
          .from('course_subtopics')
          .select('*')
          .eq('topic_id', topic.id)
          .order('order_index', { ascending: true });

        topicsWithSubtopics.push({
          ...topic,
          subtopics: subtopicsData || [],
        });
      }

      modulesWithTopics.push({
        ...mod,
        topics: topicsWithSubtopics,
        has_questions: questionsMap.has(mod.id),
        questions_count: questionsMap.get(mod.id) || 0,
      });
    }

    setModules(modulesWithTopics);
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      // Try to extract module title from filename
      const name = file.name.replace(/\.(txt|md)$/i, '').replace(/_/g, ' ');
      if (!moduleTitle) {
        setModuleTitle(name);
      }
    }
  };

  const handleUploadModule = async () => {
    if (!uploadFile) {
      toast({
        variant: 'destructive',
        title: 'No file selected',
        description: 'Please select a module file to upload.',
      });
      return;
    }

    setUploading(true);

    try {
      // Read file content
      const content = await uploadFile.text();

      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Call the parse-module edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-module`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            content,
            moduleTitle: moduleTitle || undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to parse module');
      }

      const result = await response.json();

      toast({
        title: 'Module uploaded successfully!',
        description: `Created "${result.module.title}" with ${result.module.topics_count} topics and ${result.module.subtopics_count} subtopics.`,
      });

      // Reset form and refresh
      setUploadFile(null);
      setModuleTitle('');
      setShowUploadDialog(false);
      fetchModules();
    } catch (error: unknown) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload module.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteModule = async (moduleId: string, moduleTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${moduleTitle}"? This will also delete all topics and subtopics.`)) {
      return;
    }

    try {
      // Delete in order: subtopics -> topics -> module (cascades handle most)
      const { error } = await supabase
        .from('course_modules')
        .delete()
        .eq('id', moduleId);

      if (error) throw error;

      toast({ title: 'Module deleted' });
      fetchModules();
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Failed to delete module.',
      });
    }
  };

  const toggleModuleStatus = async (moduleId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('course_modules')
      .update({ is_active: !currentStatus })
      .eq('id', moduleId);

    if (!error) {
      fetchModules();
      toast({
        title: currentStatus ? 'Module hidden' : 'Module visible',
      });
    }
  };

  const handleMoveModule = async (moduleId: string, direction: 'up' | 'down') => {
    const currentIndex = modules.findIndex(m => m.id === moduleId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= modules.length) return;

    setReordering(moduleId);

    try {
      const currentModule = modules[currentIndex];
      const swapModule = modules[newIndex];

      // Swap order_index values
      await Promise.all([
        supabase
          .from('course_modules')
          .update({ order_index: swapModule.order_index })
          .eq('id', currentModule.id),
        supabase
          .from('course_modules')
          .update({ order_index: currentModule.order_index })
          .eq('id', swapModule.id),
      ]);

      await fetchModules();
      toast({ title: `Module moved ${direction}` });
    } catch (error) {
      console.error('Reorder error:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to reorder module',
      });
    } finally {
      setReordering(null);
    }
  };

  const handleGenerateQuestions = async (moduleId: string) => {
    setGeneratingQuestions(moduleId);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-module-questions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ moduleId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate questions');
      }

      const result = await response.json();

      toast({
        title: 'Questions generated!',
        description: `Created ${result.questionsCount} MCQs for "${result.moduleTitle}".`,
      });

      fetchModules();
    } catch (error: unknown) {
      console.error('Generate questions error:', error);
      toast({
        variant: 'destructive',
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Failed to generate questions.',
      });
    } finally {
      setGeneratingQuestions(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogTrigger asChild>
          <Button className="w-full">
            <Upload className="w-4 h-4 mr-2" />
            Upload New Module
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Course Module</DialogTitle>
            <DialogDescription>
              Upload a .txt or .md file containing the module content. AI will automatically parse and structure it into topics and subtopics.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Module Title (optional)</label>
              <Input
                placeholder="Auto-detected from content if empty"
                value={moduleTitle}
                onChange={(e) => setModuleTitle(e.target.value)}
              />
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <label className="text-sm font-medium">Module File *</label>
              <Input
                type="file"
                accept=".txt,.md"
                onChange={handleFileChange}
                onClick={(e) => e.stopPropagation()}
                className="mt-2"
              />
              {uploadFile && (
                <p className="text-xs text-muted-foreground mt-1">
                  Selected: {uploadFile.name} ({Math.round(uploadFile.size / 1024)} KB)
                </p>
              )}
            </div>
            <Button
              onClick={handleUploadModule}
              disabled={uploading || !uploadFile}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Parsing with AI...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Upload & Parse Module
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modules List */}
      {modules.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No modules yet. Upload your first module to get started!</p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {modules.map((module, index) => (
            <AccordionItem
              key={module.id}
              value={module.id}
              className="border rounded-lg px-4"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={index === 0 || reordering !== null}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveModule(module.id, 'up');
                      }}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={index === modules.length - 1 || reordering !== null}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveModule(module.id, 'down');
                      }}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </div>
                  <BookOpen className="w-5 h-5 text-primary shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{module.title}</span>
                      <Badge variant={module.is_active ? 'default' : 'secondary'}>
                        {module.is_active ? 'Active' : 'Hidden'}
                      </Badge>
                      {module.has_questions && (
                        <Badge variant="outline" className="text-primary border-primary">
                          {module.questions_count} MCQs
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {module.topics.length} topics • {module.topics.reduce((acc, t) => acc + t.subtopics.length, 0)} subtopics
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  {module.description && (
                    <p className="text-sm text-muted-foreground">{module.description}</p>
                  )}
                  
                  {/* Topics */}
                  <div className="space-y-2">
                    {module.topics.map((topic) => (
                      <div key={topic.id} className="pl-4 border-l-2 border-muted">
                        <p className="font-medium text-sm">{topic.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {topic.subtopics.length} subtopics
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateQuestions(module.id)}
                      disabled={generatingQuestions === module.id}
                    >
                      {generatingQuestions === module.id ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 mr-1" />
                          {module.has_questions ? 'Regenerate MCQs' : 'Generate MCQs'}
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleModuleStatus(module.id, module.is_active)}
                    >
                      {module.is_active ? 'Hide' : 'Show'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteModule(module.id, module.title)}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
