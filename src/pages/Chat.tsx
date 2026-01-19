import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, Sparkles, Crown } from 'lucide-react';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { TypingIndicator } from '@/components/TypingIndicator';
import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import { PageLoader } from '@/components/PageLoader';
import { UpgradeModal } from '@/components/UpgradeModal';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [knowledgeSeeded, setKnowledgeSeeded] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user, loading: authLoading } = useAuth();
  const { limits, usage, loading: subLoading, incrementUsage } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    // Seed knowledge base on first load
    const seedKnowledge = async () => {
      try {
        const response = await supabase.functions.invoke('seed-knowledge');
        if (response.data?.success || response.data?.message?.includes('already')) {
          setKnowledgeSeeded(true);
        }
      } catch (error) {
        console.log('Knowledge base check:', error);
        setKnowledgeSeeded(true); // Continue anyway
      }
    };
    seedKnowledge();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const createConversation = async (firstMessage: string) => {
    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '');
    const { data, error } = await supabase
      .from('conversations')
      .insert({ user_id: user!.id, title })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
    return data.id;
  };

  const saveMessage = async (convId: string, role: 'user' | 'assistant', content: string) => {
    await supabase
      .from('messages')
      .insert({ conversation_id: convId, role, content });
  };

  const handleSend = async (content: string) => {
    if (!user) return;

    // Check if user can send messages
    if (!limits?.canUseChat) {
      setShowUpgradeModal(true);
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setIsStreaming(true);

    // Increment usage for trial users
    if (!limits?.isSubscribed) {
      await incrementUsage('chat');
    }

    let currentConvId = conversationId;
    
    // Create conversation if needed
    if (!currentConvId) {
      currentConvId = await createConversation(content);
      if (currentConvId) {
        setConversationId(currentConvId);
      }
    }

    // Save user message
    if (currentConvId) {
      await saveMessage(currentConvId, 'user', content);
    }

    // Prepare messages for API
    const apiMessages = [...messages, userMessage].map(m => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: apiMessages, conversationId: currentConvId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get response');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Stream the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      const assistantId = crypto.randomUUID();

      // Add empty assistant message
      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);
      setIsLoading(false);

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId ? { ...m, content: assistantContent } : m
                )
              );
            }
          } catch {
            // Incomplete JSON, will be handled in next iteration
          }
        }
      }

      // Save assistant message
      if (currentConvId && assistantContent) {
        await saveMessage(currentConvId, 'assistant', assistantContent);
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to get response. Please try again.',
        variant: 'destructive',
      });
      setIsLoading(false);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleNewConversation = () => {
    setConversationId(null);
    setMessages([]);
  };

  const handleSelectConversation = async (id: string) => {
    setConversationId(id);
    
    // Load messages for this conversation
    const { data, error } = await supabase
      .from('messages')
      .select('id, role, content')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data.map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })));
    }
  };

  if (authLoading || subLoading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Sidebar
        currentConversationId={conversationId || undefined}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
      />

      <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} triggerType="chat" />

      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-border/50">
        <div className="flex items-center justify-center gap-3 px-4 py-3 md:ml-16">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="font-semibold text-sm gradient-text">MediGuide AI</h1>
            <p className="text-xs text-muted-foreground">Ghana STG Assistant</p>
          </div>
          {!limits?.isSubscribed && usage && (
            <Badge variant="outline" className="ml-2 text-xs">
              <Crown className="w-3 h-3 mr-1" />
              {usage.chatMessagesUsed}/{usage.chatMessagesLimit}
            </Badge>
          )}
        </div>
      </header>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-32 md:pb-24">
        {messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6"
            >
              <Stethoscope className="w-10 h-10 text-primary" />
            </motion.div>
            <h2 className="text-2xl font-bold mb-2">Welcome to MediGuide AI</h2>
            <p className="text-muted-foreground max-w-md mb-8">
              Your intelligent assistant for the Ghana Standard Treatment Guidelines. 
              Ask me about treatments, medications, symptoms, and medical protocols.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {['Malaria treatment', 'Hypertension management', 'Diabetes care', 'Pneumonia symptoms'].map((topic, i) => (
                <motion.button
                  key={topic}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSend(`What is the recommended treatment for ${topic.toLowerCase()}?`)}
                  className="px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm border border-border hover:bg-secondary/80 transition-colors flex items-center gap-2"
                >
                  <Sparkles className="w-3 h-3 text-primary" />
                  {topic}
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="max-w-3xl mx-auto">
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  isStreaming={isStreaming && message === messages[messages.length - 1] && message.role === 'assistant'}
                />
              ))}
            </AnimatePresence>
            {isLoading && <TypingIndicator />}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 p-4 glass border-t border-border/50">
        <div className="max-w-3xl mx-auto md:ml-auto md:mr-auto">
          <ChatInput
            onSend={handleSend}
            disabled={isLoading}
            placeholder="Ask about treatments, medications, symptoms..."
          />
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
