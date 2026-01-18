import { motion } from 'framer-motion';
import { Bot, User, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export function ChatMessage({ role, content, isStreaming }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isAssistant = role === 'assistant';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple markdown-like formatting
  const formatContent = (text: string) => {
    return text
      .split('\n')
      .map((line, i) => {
        // Headers
        if (line.startsWith('## ')) {
          return <h3 key={i} className="text-lg font-semibold mt-4 mb-2 text-foreground">{line.slice(3)}</h3>;
        }
        if (line.startsWith('# ')) {
          return <h2 key={i} className="text-xl font-bold mt-4 mb-2 text-foreground">{line.slice(2)}</h2>;
        }
        // Bold
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} className="font-semibold my-1">{line.slice(2, -2)}</p>;
        }
        // Bullet points
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return (
            <div key={i} className="flex gap-2 my-1">
              <span className="text-primary">•</span>
              <span>{line.slice(2)}</span>
            </div>
          );
        }
        // Numbered lists
        if (/^\d+\.\s/.test(line)) {
          const match = line.match(/^(\d+)\.\s(.*)$/);
          if (match) {
            return (
              <div key={i} className="flex gap-2 my-1">
                <span className="text-primary font-medium min-w-[1.5rem]">{match[1]}.</span>
                <span>{match[2]}</span>
              </div>
            );
          }
        }
        // Empty lines
        if (line.trim() === '') {
          return <div key={i} className="h-2" />;
        }
        // Regular text
        return <p key={i} className="my-1">{line}</p>;
      });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "flex gap-3 px-4 py-4 group",
        isAssistant ? "bg-card/50" : ""
      )}
    >
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
        isAssistant 
          ? "bg-primary text-primary-foreground" 
          : "bg-secondary text-secondary-foreground"
      )}>
        {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">
            {isAssistant ? 'MediGuide AI' : 'You'}
          </span>
          {isAssistant && !isStreaming && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
        <div className={cn(
          "text-sm leading-relaxed prose prose-sm max-w-none",
          isStreaming && "animate-pulse-soft"
        )}>
          {formatContent(content)}
          {isStreaming && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="inline-block w-2 h-4 bg-primary ml-1 rounded-sm"
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}
