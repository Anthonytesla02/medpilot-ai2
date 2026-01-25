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
  let multiLineQuestion = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines (but don't skip headers, they might be context)
    if (!line) {
      if (inContext && currentContext.length > 0) {
        // Empty line might end context
      }
      continue;
    }

    // Check for context block indicators
    if (line.toLowerCase().includes('use the following') || 
        line.toLowerCase().includes('read the following') ||
        line.toLowerCase().includes('refer to') ||
        line.toLowerCase().includes('based on') ||
        line.match(/^[A-Z][A-Z\s]{5,}$/) || // ALL CAPS headers
        (line.startsWith('**') && line.endsWith('**')) || // Bold headers
        line.startsWith('###') || line.startsWith('##')) { // Markdown headers
      
      // Save previous question if exists before starting new context
      if (currentQuestion && currentQuestion.question && currentQuestion.options?.length) {
        finalizeQuestion(currentQuestion, questions);
        currentQuestion = null;
      }
      
      inContext = true;
      currentContext = [line.replace(/^#+\s*/, '').replace(/\*\*/g, '')];
      continue;
    }

    // Check for question start - multiple patterns
    // Pattern 1: "1. Question text" or "1) Question text"
    // Pattern 2: "Question 1:" or "Q1:" or "Q1."
    // Pattern 3: "1:" followed by question
    const questionPatterns = [
      /^(\d+)[.)]\s*(.+)/,                    // 1. or 1)
      /^(?:question|q)\s*(\d+)[.:]\s*(.+)/i,  // Question 1: or Q1:
      /^(\d+)[:]\s*(.+)/,                     // 1:
      /^\*\*(\d+)[.)]\*\*\s*(.+)/,            // **1.** or **1)**
      /^(\d+)[.)]\s*\*\*(.+)\*\*/,            // 1. **question**
    ];

    let questionMatch: RegExpMatchArray | null = null;
    for (const pattern of questionPatterns) {
      questionMatch = line.match(pattern);
      if (questionMatch) break;
    }

    if (questionMatch) {
      // Save previous question if exists
      if (currentQuestion && currentQuestion.question && currentQuestion.options?.length) {
        finalizeQuestion(currentQuestion, questions);
      }

      const questionText = questionMatch[2].replace(/\*\*/g, '').trim();
      
      currentQuestion = {
        id: questionId++,
        question: questionText,
        options: [],
        context: currentContext.length > 0 ? currentContext.join('\n') : undefined,
      };
      inContext = false;
      multiLineQuestion = '';
      continue;
    }

    // Check for options - multiple patterns
    // Pattern 1: "a) text" or "a. text" or "A) text"
    // Pattern 2: "(a) text" or "(A) text"
    // Pattern 3: "a- text" or "A- text"
    // Pattern 4: "**a)** text" or "- a) text"
    const optionPatterns = [
      /^([a-dA-D])[.)]\s*(.+)/,               // a) or a.
      /^\(([a-dA-D])\)\s*(.+)/,               // (a)
      /^([a-dA-D])[-–]\s*(.+)/,               // a- or a–
      /^\*\*([a-dA-D])[.)]\*\*\s*(.+)/,       // **a)**
      /^[-•]\s*([a-dA-D])[.)]\s*(.+)/,        // - a) or • a)
      /^([a-dA-D])[.)]\s*\*\*(.+)\*\*/,       // a) **text**
    ];

    let optionMatch: RegExpMatchArray | null = null;
    for (const pattern of optionPatterns) {
      optionMatch = line.match(pattern);
      if (optionMatch) break;
    }

    if (optionMatch && currentQuestion) {
      currentQuestion.options = currentQuestion.options || [];
      const optionText = optionMatch[2].replace(/\*\*/g, '').trim();
      currentQuestion.options.push({
        letter: optionMatch[1].toLowerCase(),
        text: optionText
      });
      continue;
    }

    // Check for answer line - multiple patterns
    const answerPatterns = [
      /^(?:answer|ans|correct|correct answer)[:\s]+([a-dA-D])/i,
      /^\*\*(?:answer|ans)[:\s]*\*\*\s*([a-dA-D])/i,
      /^(?:answer|ans)[:\s]*\(?([a-dA-D])\)?/i,
    ];

    let answerMatch: RegExpMatchArray | null = null;
    for (const pattern of answerPatterns) {
      answerMatch = line.match(pattern);
      if (answerMatch) break;
    }

    if (answerMatch && currentQuestion) {
      currentQuestion.correctAnswer = answerMatch[1].toLowerCase();
      continue;
    }

    // Check for explanation - multiple patterns
    const explanationPatterns = [
      /^(?:explanation|exp|note|reason)[:\s]+(.+)/i,
      /^\*\*(?:explanation|exp)[:\s]*\*\*\s*(.+)/i,
    ];

    let explanationMatch: RegExpMatchArray | null = null;
    for (const pattern of explanationPatterns) {
      explanationMatch = line.match(pattern);
      if (explanationMatch) break;
    }

    if (explanationMatch && currentQuestion) {
      currentQuestion.explanation = explanationMatch[1].replace(/\*\*/g, '').trim();
      continue;
    }

    // If we're in a question but haven't found options yet, this might be continuation of question text
    if (currentQuestion && (!currentQuestion.options || currentQuestion.options.length === 0)) {
      // Append to question if it looks like continuation
      if (!line.startsWith('#') && !line.match(/^[a-dA-D][.)]/)) {
        currentQuestion.question += ' ' + line.replace(/\*\*/g, '');
      }
      continue;
    }

    // If in context, add to context
    if (inContext) {
      currentContext.push(line.replace(/\*\*/g, ''));
    }
  }

  // Don't forget the last question
  if (currentQuestion && currentQuestion.question && currentQuestion.options?.length) {
    finalizeQuestion(currentQuestion, questions);
  }

  return questions;
}

function finalizeQuestion(question: Partial<ParsedQuestion>, questions: ParsedQuestion[]): void {
  // Set defaults for missing fields
  if (!question.correctAnswer) {
    question.correctAnswer = 'a'; // Default to 'a' if not specified
  }
  if (!question.explanation) {
    question.explanation = 'See study materials for detailed explanation.';
  }
  
  // Clean up question text
  question.question = question.question?.trim().replace(/\s+/g, ' ');
  
  // Only add if we have valid data
  if (question.question && question.options && question.options.length >= 2) {
    questions.push(question as ParsedQuestion);
  }
}
