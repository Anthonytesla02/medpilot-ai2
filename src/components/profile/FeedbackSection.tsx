import { useState, useEffect } from 'react';
import { MessageSquarePlus, Send, Clock, CheckCircle2, Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface FeedbackItem {
  id: string;
  subject: string;
  message: string;
  status: string;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
}

interface FeedbackSectionProps {
  userId: string;
}

export function FeedbackSection({ userId }: FeedbackSectionProps) {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchFeedbacks();
  }, [userId]);

  const fetchFeedbacks = async () => {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setFeedbacks(data);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      toast({ variant: 'destructive', title: 'Please fill in all fields' });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('feedback').insert({
      user_id: userId,
      subject: subject.trim(),
      message: message.trim(),
    });

    if (error) {
      toast({ variant: 'destructive', title: 'Failed to send feedback' });
    } else {
      toast({ title: 'Feedback sent!', description: 'We\'ll get back to you soon.' });
      setSubject('');
      setMessage('');
      setDialogOpen(false);
      fetchFeedbacks();
    }
    setSubmitting(false);
  };

  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline'; icon: React.ReactNode }> = {
    pending: { label: 'Pending', variant: 'secondary', icon: <Clock className="w-3 h-3" /> },
    in_progress: { label: 'In Progress', variant: 'outline', icon: <Loader2 className="w-3 h-3" /> },
    completed: { label: 'Completed', variant: 'default', icon: <CheckCircle2 className="w-3 h-3" /> },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground px-1">Feedback & Issues</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <MessageSquarePlus className="w-4 h-4 mr-1" />
              New
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Feedback</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Input
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={100}
              />
              <Textarea
                placeholder="Describe your issue or feedback..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={1000}
                rows={4}
              />
              <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Send Feedback
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground text-sm py-6">Loading...</div>
      ) : feedbacks.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No feedback submitted yet
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {feedbacks.map((fb) => {
            const config = statusConfig[fb.status] || statusConfig.pending;
            return (
              <Card key={fb.id}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm">{fb.subject}</p>
                    <Badge variant={config.variant} className="flex items-center gap-1 shrink-0">
                      {config.icon}
                      {config.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{fb.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(fb.created_at), 'MMM dd, yyyy h:mm a')}
                  </p>
                  {fb.admin_reply && (
                    <div className="mt-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-xs font-medium text-primary mb-1">Admin Reply</p>
                      <p className="text-xs text-muted-foreground">{fb.admin_reply}</p>
                      {fb.replied_at && (
                        <p className="text-xs text-muted-foreground mt-1 opacity-70">
                          {format(new Date(fb.replied_at), 'MMM dd, yyyy h:mm a')}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
