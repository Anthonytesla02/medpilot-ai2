import { useState, useEffect } from 'react';
import { CheckCircle2, Clock, Loader2, MessageCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface FeedbackItem {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: string;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

export function FeedbackManager() {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Fetch user profiles for display
      const userIds = [...new Set(data.map(f => f.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      setFeedbacks(data.map(fb => ({
        ...fb,
        user_email: profileMap.get(fb.user_id)?.email || 'Unknown',
        user_name: profileMap.get(fb.user_id)?.display_name || 'Unknown',
      })));
    }
    setLoading(false);
  };

  const handleReply = async (feedbackId: string) => {
    if (!replyText.trim()) return;
    setSubmitting(true);

    const { error } = await supabase
      .from('feedback')
      .update({
        admin_reply: replyText.trim(),
        replied_at: new Date().toISOString(),
        status: 'completed',
      })
      .eq('id', feedbackId);

    if (error) {
      toast({ variant: 'destructive', title: 'Failed to send reply' });
    } else {
      toast({ title: 'Reply sent' });
      setReplyingTo(null);
      setReplyText('');
      fetchFeedbacks();
    }
    setSubmitting(false);
  };

  const handleStatusChange = async (feedbackId: string, newStatus: string) => {
    const { error } = await supabase
      .from('feedback')
      .update({ status: newStatus })
      .eq('id', feedbackId);

    if (!error) {
      setFeedbacks(prev => prev.map(fb =>
        fb.id === feedbackId ? { ...fb, status: newStatus } : fb
      ));
    }
  };

  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: React.ReactNode }> = {
    pending: { label: 'Pending', variant: 'secondary', icon: <Clock className="w-3 h-3" /> },
    in_progress: { label: 'In Progress', variant: 'outline', icon: <Loader2 className="w-3 h-3" /> },
    completed: { label: 'Completed', variant: 'default', icon: <CheckCircle2 className="w-3 h-3" /> },
  };

  const filtered = filterStatus === 'all' ? feedbacks : feedbacks.filter(f => f.status === filterStatus);

  if (loading) {
    return <div className="text-center text-muted-foreground py-8">Loading feedback...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{feedbacks.length} total feedback items</p>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No feedback found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((fb) => {
            const config = statusConfig[fb.status] || statusConfig.pending;
            return (
              <Card key={fb.id}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{fb.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        From: {fb.user_name} ({fb.user_email})
                      </p>
                    </div>
                    <Select
                      value={fb.status}
                      onValueChange={(val) => handleStatusChange(fb.id, val)}
                    >
                      <SelectTrigger className="w-32 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <p className="text-sm text-muted-foreground">{fb.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(fb.created_at), 'MMM dd, yyyy h:mm a')}
                  </p>

                  {fb.admin_reply && (
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-xs font-medium text-primary mb-1">Your Reply</p>
                      <p className="text-sm text-muted-foreground">{fb.admin_reply}</p>
                    </div>
                  )}

                  {replyingTo === fb.id ? (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Type your reply..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        maxLength={1000}
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleReply(fb.id)} disabled={submitting}>
                          {submitting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
                          Send
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setReplyingTo(null); setReplyText(''); }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setReplyingTo(fb.id); setReplyText(fb.admin_reply || ''); }}
                    >
                      <MessageCircle className="w-3 h-3 mr-1" />
                      {fb.admin_reply ? 'Edit Reply' : 'Reply'}
                    </Button>
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
