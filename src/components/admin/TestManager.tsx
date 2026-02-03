import { useState, useEffect } from 'react';
import { Plus, Upload, Trash2, Loader2, FileText, Sparkles, Check, X, Edit2, ChevronLeft, ChevronRight, AlertCircle, Eye, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface ParsedQuestion {
  id: number;
  question: string;
  context?: string;
  options: { letter: string; text: string }[];
  correctAnswer: string;
  explanation: string;
  needsReview: boolean;
}

interface Test {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  questions: ParsedQuestion[];
  is_active: boolean;
  created_at: string;
}

type Step = 'upload' | 'review' | 'complete';

export function TestManager() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [step, setStep] = useState<Step>('upload');
  
  // Upload state
  const [uploadMode, setUploadMode] = useState<'paste' | 'file'>('paste');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [pastedContent, setPastedContent] = useState('');
  const [testTitle, setTestTitle] = useState('');
  const [testDescription, setTestDescription] = useState('');
  const [testCategory, setTestCategory] = useState('');
  const [parsing, setParsing] = useState(false);
  
  // Review state
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [editingQuestion, setEditingQuestion] = useState<ParsedQuestion | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tests')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTests(data.map(test => ({
        ...test,
        questions: Array.isArray(test.questions) ? test.questions as unknown as ParsedQuestion[] : []
      })));
    }
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      if (!testTitle) {
        const name = file.name.replace(/\.(txt|md)$/i, '').replace(/_/g, ' ');
        setTestTitle(name);
      }
    }
  };

  const handleParseQuestions = async () => {
    const hasFile = !!uploadFile;
    const hasPaste = pastedContent.trim().length > 0;

    if (uploadMode === 'file' && !hasFile) {
      toast({
        variant: 'destructive',
        title: 'No file selected',
        description: 'Please select a file to upload.',
      });
      return;
    }

    if (uploadMode === 'paste' && !hasPaste) {
      toast({
        variant: 'destructive',
        title: 'No content provided',
        description: 'Please paste the question content.',
      });
      return;
    }

    if (!testTitle.trim()) {
      toast({
        variant: 'destructive',
        title: 'Title required',
        description: 'Please provide a test title.',
      });
      return;
    }

    setParsing(true);

    try {
      const content = uploadMode === 'paste' 
        ? pastedContent 
        : await uploadFile!.text();

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-test-questions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ content }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to parse questions');
      }

      const result = await response.json();

      if (!result.questions || result.questions.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No questions found',
          description: 'Could not parse any questions from the provided content.',
        });
        setParsing(false);
        return;
      }

      setParsedQuestions(result.questions);
      setCurrentQuestionIndex(0);
      setStep('review');

      toast({
        title: 'Questions parsed!',
        description: `Found ${result.totalParsed} questions. ${result.needsReviewCount} need your review.`,
      });
    } catch (error: unknown) {
      console.error('Parse error:', error);
      toast({
        variant: 'destructive',
        title: 'Parsing failed',
        description: error instanceof Error ? error.message : 'Failed to parse questions.',
      });
    } finally {
      setParsing(false);
    }
  };

  const handleUpdateQuestion = (updatedQuestion: ParsedQuestion) => {
    setParsedQuestions(prev => 
      prev.map(q => q.id === updatedQuestion.id ? { ...updatedQuestion, needsReview: false } : q)
    );
    setEditingQuestion(null);
  };

  const handleDeleteQuestion = (questionId: number) => {
    setParsedQuestions(prev => prev.filter(q => q.id !== questionId));
    if (currentQuestionIndex >= parsedQuestions.length - 1) {
      setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1));
    }
  };

  const handleSubmitTest = async () => {
    if (parsedQuestions.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No questions',
        description: 'Please add at least one question.',
      });
      return;
    }

    const unreviewedCount = parsedQuestions.filter(q => q.needsReview).length;
    if (unreviewedCount > 0) {
      const proceed = confirm(`${unreviewedCount} questions still need review. Submit anyway?`);
      if (!proceed) return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from('tests').insert([{
        title: testTitle,
        description: testDescription || null,
        category: testCategory || null,
        questions: parsedQuestions as any,
        created_by: user!.id,
        is_active: true,
      }]);

      if (error) throw error;

      toast({
        title: 'Test created!',
        description: `Successfully created "${testTitle}" with ${parsedQuestions.length} questions.`,
      });

      // Reset and close
      resetDialog();
      fetchTests();
    } catch (error: unknown) {
      console.error('Submit error:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to create test',
        description: error instanceof Error ? error.message : 'Unknown error occurred.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetDialog = () => {
    setShowUploadDialog(false);
    setStep('upload');
    setUploadFile(null);
    setPastedContent('');
    setTestTitle('');
    setTestDescription('');
    setTestCategory('');
    setParsedQuestions([]);
    setCurrentQuestionIndex(0);
    setEditingQuestion(null);
  };

  const toggleTestStatus = async (testId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('tests')
      .update({ is_active: !currentStatus })
      .eq('id', testId);

    if (!error) {
      fetchTests();
      toast({
        title: currentStatus ? 'Test deactivated' : 'Test activated',
      });
    }
  };

  const deleteTest = async (testId: string) => {
    if (!confirm('Are you sure you want to delete this test?')) return;

    const { error } = await supabase
      .from('tests')
      .delete()
      .eq('id', testId);

    if (!error) {
      fetchTests();
      toast({ title: 'Test deleted' });
    }
  };

  const currentQuestion = parsedQuestions[currentQuestionIndex];
  const reviewedCount = parsedQuestions.filter(q => !q.needsReview).length;
  const progressPercent = parsedQuestions.length > 0 
    ? (reviewedCount / parsedQuestions.length) * 100 
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create Test Button */}
      <Dialog open={showUploadDialog} onOpenChange={(open) => {
        if (!open) resetDialog();
        else setShowUploadDialog(true);
      }}>
        <DialogTrigger asChild>
          <Button className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Create New Test
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {step === 'upload' && (
            <>
              <DialogHeader>
                <DialogTitle>Create New Test</DialogTitle>
                <DialogDescription>
                  Paste or upload questions. AI will parse them and you can review before saving.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Test Title *</Label>
                  <Input
                    placeholder="Enter test title"
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Optional description"
                    value={testDescription}
                    onChange={(e) => setTestDescription(e.target.value)}
                    className="min-h-[60px]"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Input
                    placeholder="e.g., Pharmacy Law, Medicine"
                    value={testCategory}
                    onChange={(e) => setTestCategory(e.target.value)}
                  />
                </div>

                <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as 'paste' | 'file')}>
                  <TabsList className="w-full">
                    <TabsTrigger value="paste" className="flex-1">
                      <FileText className="w-4 h-4 mr-2" />
                      Paste Content
                    </TabsTrigger>
                    <TabsTrigger value="file" className="flex-1">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload File
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="paste" className="mt-4 space-y-2">
                    <Label>Question Content *</Label>
                    <Textarea
                      placeholder="Paste your questions here. Supports both Roman numeral (I, II, III) and standard (a, b, c, d) formats..."
                      value={pastedContent}
                      onChange={(e) => setPastedContent(e.target.value)}
                      className="min-h-[200px] resize-y font-mono text-sm"
                    />
                    {pastedContent.trim().length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {pastedContent.trim().length.toLocaleString()} characters
                      </p>
                    )}
                  </TabsContent>

                  <TabsContent value="file" className="mt-4 space-y-2">
                    <Label>Question File *</Label>
                    <Input
                      type="file"
                      accept=".txt,.md"
                      onChange={handleFileChange}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {uploadFile && (
                      <p className="text-xs text-muted-foreground">
                        Selected: {uploadFile.name} ({Math.round(uploadFile.size / 1024)} KB)
                      </p>
                    )}
                  </TabsContent>
                </Tabs>

                <Button
                  onClick={handleParseQuestions}
                  disabled={parsing || (uploadMode === 'paste' ? pastedContent.trim().length === 0 : !uploadFile) || !testTitle.trim()}
                  className="w-full"
                >
                  {parsing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Parsing with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Parse Questions
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {step === 'review' && currentQuestion && (
            <>
              <DialogHeader>
                <DialogTitle>Review Questions</DialogTitle>
                <DialogDescription>
                  Review and edit questions before saving. Select correct answers for any that need review.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Question {currentQuestionIndex + 1} of {parsedQuestions.length}</span>
                    <span>{reviewedCount} reviewed</span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>

                {/* Question Card */}
                <Card className={currentQuestion.needsReview ? 'border-warning' : 'border-primary'}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">
                        {currentQuestion.needsReview && (
                          <Badge variant="outline" className="mr-2 text-warning border-warning">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Needs Review
                          </Badge>
                        )}
                        Question {currentQuestion.id}
                      </CardTitle>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingQuestion(currentQuestion)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteQuestion(currentQuestion.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {currentQuestion.context && (
                      <div className="p-3 bg-muted rounded-md text-sm">
                        <p className="font-medium text-xs text-muted-foreground mb-1">Context:</p>
                        <p className="whitespace-pre-wrap">{currentQuestion.context}</p>
                      </div>
                    )}

                    <p className="whitespace-pre-wrap">{currentQuestion.question}</p>

                    <RadioGroup
                      value={currentQuestion.correctAnswer}
                      onValueChange={(value) => {
                        handleUpdateQuestion({
                          ...currentQuestion,
                          correctAnswer: value,
                          needsReview: false,
                        });
                      }}
                    >
                      {currentQuestion.options.map((option) => (
                        <div
                          key={option.letter}
                          className={`flex items-center space-x-3 p-3 rounded-md border ${
                            currentQuestion.correctAnswer === option.letter
                              ? 'border-primary bg-primary/10'
                              : 'border-border'
                          }`}
                        >
                          <RadioGroupItem value={option.letter} id={`q${currentQuestion.id}-${option.letter}`} />
                          <Label htmlFor={`q${currentQuestion.id}-${option.letter}`} className="flex-1 cursor-pointer">
                            <span className="font-medium uppercase mr-2">{option.letter}.</span>
                            {option.text}
                          </Label>
                          {currentQuestion.correctAnswer === option.letter && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </div>
                      ))}
                    </RadioGroup>

                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium">Explanation:</p>
                      <p>{currentQuestion.explanation}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Navigation */}
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentQuestionIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>

                  {currentQuestionIndex < parsedQuestions.length - 1 ? (
                    <Button
                      onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <Button onClick={handleSubmitTest} disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Save Test ({parsedQuestions.length} questions)
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Quick jump */}
                <div className="flex flex-wrap gap-1">
                  {parsedQuestions.map((q, idx) => (
                    <Button
                      key={q.id}
                      variant={idx === currentQuestionIndex ? 'default' : q.needsReview ? 'outline' : 'secondary'}
                      size="sm"
                      className={`w-8 h-8 p-0 ${q.needsReview && idx !== currentQuestionIndex ? 'border-warning' : ''}`}
                      onClick={() => setCurrentQuestionIndex(idx)}
                    >
                      {idx + 1}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Question Modal */}
      {editingQuestion && (
        <Dialog open={!!editingQuestion} onOpenChange={() => setEditingQuestion(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Question {editingQuestion.id}</DialogTitle>
            </DialogHeader>
            <QuestionEditor
              question={editingQuestion}
              onSave={handleUpdateQuestion}
              onCancel={() => setEditingQuestion(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Tests List */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Questions</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tests.map((test) => (
              <TableRow key={test.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{test.title}</p>
                    {test.category && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        {test.category}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{test.questions.length}</TableCell>
                <TableCell>
                  <Badge variant={test.is_active ? 'default' : 'secondary'}>
                    {test.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleTestStatus(test.id, test.is_active)}
                    >
                      {test.is_active ? (
                        <ToggleRight className="w-4 h-4 text-primary" />
                      ) : (
                        <ToggleLeft className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTest(test.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {tests.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No tests created yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Question Editor Component
function QuestionEditor({ 
  question, 
  onSave, 
  onCancel 
}: { 
  question: ParsedQuestion; 
  onSave: (q: ParsedQuestion) => void; 
  onCancel: () => void;
}) {
  const [editedQuestion, setEditedQuestion] = useState<ParsedQuestion>({ ...question });

  const updateOption = (letter: string, text: string) => {
    setEditedQuestion(prev => ({
      ...prev,
      options: prev.options.map(o => o.letter === letter ? { ...o, text } : o)
    }));
  };

  return (
    <div className="space-y-4 py-4">
      <div>
        <Label>Question Text</Label>
        <Textarea
          value={editedQuestion.question}
          onChange={(e) => setEditedQuestion(prev => ({ ...prev, question: e.target.value }))}
          className="min-h-[100px]"
        />
      </div>

      <div>
        <Label>Context (optional)</Label>
        <Textarea
          value={editedQuestion.context || ''}
          onChange={(e) => setEditedQuestion(prev => ({ ...prev, context: e.target.value || undefined }))}
          placeholder="Optional preamble or context..."
          className="min-h-[60px]"
        />
      </div>

      <div className="space-y-2">
        <Label>Options</Label>
        {editedQuestion.options.map((option) => (
          <div key={option.letter} className="flex items-center gap-2">
            <span className="w-6 font-medium uppercase">{option.letter}.</span>
            <Input
              value={option.text}
              onChange={(e) => updateOption(option.letter, e.target.value)}
              className="flex-1"
            />
          </div>
        ))}
      </div>

      <div>
        <Label>Correct Answer</Label>
        <RadioGroup
          value={editedQuestion.correctAnswer}
          onValueChange={(value) => setEditedQuestion(prev => ({ ...prev, correctAnswer: value }))}
          className="flex gap-4 mt-2"
        >
          {editedQuestion.options.map((option) => (
            <div key={option.letter} className="flex items-center space-x-2">
              <RadioGroupItem value={option.letter} id={`edit-${option.letter}`} />
              <Label htmlFor={`edit-${option.letter}`} className="uppercase">{option.letter}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div>
        <Label>Explanation</Label>
        <Textarea
          value={editedQuestion.explanation}
          onChange={(e) => setEditedQuestion(prev => ({ ...prev, explanation: e.target.value }))}
          className="min-h-[60px]"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-1" />
          Cancel
        </Button>
        <Button onClick={() => onSave(editedQuestion)}>
          <Check className="w-4 h-4 mr-1" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}
