import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const suggestedQuestions = [
  "How do I treat malaria?",
  "What are the symptoms of typhoid?",
  "Treatment for hypertension",
  "Managing diabetes mellitus",
];

export function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);

  return (
    <div className="space-y-3">
      {/* Suggested questions - only show when empty */}
      {!message && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-2 px-1"
        >
          {suggestedQuestions.map((question, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setMessage(question)}
              className="px-3 py-1.5 text-xs rounded-full bg-secondary/80 hover:bg-secondary text-secondary-foreground border border-border/50 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3 h-3 text-primary" />
              {question}
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Input area */}
      <div className="relative flex items-end gap-2 p-2 rounded-2xl border border-border bg-card shadow-soft">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Ask about treatments, medications, symptoms..."}
          disabled={disabled}
          className="flex-1 min-h-[44px] max-h-[150px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm placeholder:text-muted-foreground/60"
          rows={1}
        />
        <Button
          onClick={handleSubmit}
          disabled={!message.trim() || disabled}
          size="icon"
          className={cn(
            "h-10 w-10 rounded-xl transition-all duration-200",
            message.trim() && !disabled
              ? "bg-primary hover:bg-primary/90 shadow-glow"
              : "bg-muted text-muted-foreground"
          )}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
