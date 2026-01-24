export interface ParsedQuestion {
  id: number;
  context?: string;
  question: string;
  options: { letter: string; text: string }[];
  correctAnswer: string;
  explanation: string;
}

export function parseMarkdownQuestions(markdown: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  const lines = markdown.split('\n');
  
  let currentQuestion: Partial<ParsedQuestion> | null = null;
  let currentContext: string[] = [];
  let inContext = false;
  let questionId = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and headers
    if (!line || line.startsWith('#')) continue;

    // Check for context block (usually starts with "Use the following" or similar)
    if (line.toLowerCase().includes('use the following') || 
        line.toLowerCase().includes('read the following') ||
        line.match(/^[A-Z][A-Z\s]+$/)) {
      inContext = true;
      currentContext = [line];
      continue;
    }

    // Check for question start (numbered question)
    const questionMatch = line.match(/^(\d+)[.)]\s*(.+)/);
    if (questionMatch) {
      // Save previous question if exists
      if (currentQuestion && currentQuestion.question && currentQuestion.options?.length) {
        if (!currentQuestion.correctAnswer) {
          currentQuestion.correctAnswer = 'a'; // Default
        }
        if (!currentQuestion.explanation) {
          currentQuestion.explanation = 'See study materials for detailed explanation.';
        }
        questions.push(currentQuestion as ParsedQuestion);
      }

      currentQuestion = {
        id: questionId++,
        question: questionMatch[2],
        options: [],
        context: currentContext.length > 0 ? currentContext.join('\n') : undefined,
      };
      inContext = false;
      continue;
    }

    // Check for options (a), b), c), d) or a. b. c. d.)
    const optionMatch = line.match(/^([a-d])[.)]\s*(.+)/i);
    if (optionMatch && currentQuestion) {
      currentQuestion.options = currentQuestion.options || [];
      currentQuestion.options.push({
        letter: optionMatch[1].toLowerCase(),
        text: optionMatch[2]
      });
      continue;
    }

    // Check for answer line
    const answerMatch = line.match(/^(?:answer|ans|correct)[:\s]*([a-d])/i);
    if (answerMatch && currentQuestion) {
      currentQuestion.correctAnswer = answerMatch[1].toLowerCase();
      continue;
    }

    // Check for explanation
    const explanationMatch = line.match(/^(?:explanation|exp|note)[:\s]*(.+)/i);
    if (explanationMatch && currentQuestion) {
      currentQuestion.explanation = explanationMatch[1];
      continue;
    }

    // If in context, add to context
    if (inContext) {
      currentContext.push(line);
    }
  }

  // Don't forget the last question
  if (currentQuestion && currentQuestion.question && currentQuestion.options?.length) {
    if (!currentQuestion.correctAnswer) {
      currentQuestion.correctAnswer = 'a';
    }
    if (!currentQuestion.explanation) {
      currentQuestion.explanation = 'See study materials for detailed explanation.';
    }
    questions.push(currentQuestion as ParsedQuestion);
  }

  return questions;
}
