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
  
  // Pre-process the markdown to normalize it
  let normalized = markdown
    // Remove blockquote markers
    .replace(/^>\s*/gm, '')
    // Remove escaped backslashes before parentheses/periods: 1\) -> 1)
    .replace(/(\d+)\\([.)]/g, '$1$2')
    // Remove escaped backslashes before letters: a\) -> a)
    .replace(/([a-dA-D])\\([.)]/g, '$1$2')
    // Normalize bold/underline markdown
    .replace(/\*\*<u>|<\/u>\*\*/g, '')
    .replace(/\*\*/g, '')
    .replace(/<u>|<\/u>/g, '')
    // Replace multiple spaces with single space
    .replace(/\s{2,}/g, ' ')
    // Normalize line endings
    .replace(/\r\n/g, '\n');

  // Split into lines
  const lines = normalized.split('\n');
  
  let currentQuestion: Partial<ParsedQuestion> | null = null;
  let currentContext: string[] = [];
  let inContext = false;
  let questionId = 1;

  // Helper to extract options from a line
  const extractOptions = (text: string): { letter: string; text: string }[] => {
    const options: { letter: string; text: string }[] = [];
    
    // Pattern to match options: a. text, a) text, (a) text
    // Handle options that may be on the same line
    const optionRegex = /([a-dA-D])[.)]\s*([^a-dA-D]+?)(?=\s+[a-dA-D][.)]|$)/gi;
    let match;
    
    while ((match = optionRegex.exec(text)) !== null) {
      const letter = match[1].toLowerCase();
      let optionText = match[2].trim();
      
      // Skip if text is too short or just whitespace
      if (optionText.length > 0) {
        options.push({ letter, text: optionText });
      }
    }
    
    return options;
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Skip header lines
    if (line.toUpperCase().includes('MCA QUESTIONS') || 
        line.toLowerCase().includes('choose the appropriate') ||
        line.toLowerCase().includes('circling')) {
      continue;
    }

    // Check for context block (like "Use the cough mixture below to answer question 1-8")
    if (line.toLowerCase().includes('use the') && line.toLowerCase().includes('to answer') ||
        line.toLowerCase().includes('refer to') ||
        line.toLowerCase().includes('read the following')) {
      inContext = true;
      currentContext = [line];
      continue;
    }

    // Check for product/context information (all caps or specific patterns)
    if (inContext || 
        (line.match(/^[A-Z][A-Z\s]+$/) && !line.match(/^\d/)) ||
        line.toLowerCase().includes('each 5ml') ||
        line.includes('……') ||
        line.match(/\d+mg$/)) {
      if (!inContext) {
        inContext = true;
        currentContext = [];
      }
      currentContext.push(line.replace(/…+/g, '...'));
      continue;
    }

    // Check for question start (numbered question)
    const questionMatch = line.match(/^(\d+)[.)]\s*(.+)/);
    if (questionMatch) {
      // Save previous question if exists
      if (currentQuestion && currentQuestion.question && currentQuestion.options && currentQuestion.options.length >= 2) {
        finalizeQuestion(currentQuestion, questions);
      }

      inContext = false;
      const questionNum = parseInt(questionMatch[1]);
      let questionText = questionMatch[2].trim();
      
      // Check if options are on the same line as the question
      // Look for pattern like "What type of cough? a. Option1 b. Option2"
      const inlineOptionMatch = questionText.match(/^(.+?)\s+([a-dA-D][.)].+)$/);
      
      let extractedOptions: { letter: string; text: string }[] = [];
      
      if (inlineOptionMatch) {
        questionText = inlineOptionMatch[1].trim();
        extractedOptions = extractOptions(inlineOptionMatch[2]);
      }

      currentQuestion = {
        id: questionId++,
        question: questionText,
        options: extractedOptions,
        context: currentContext.length > 0 ? currentContext.join('\n') : undefined,
      };
      continue;
    }

    // Check for standalone options or inline options
    if (currentQuestion) {
      // Check if line starts with an option letter
      const optionMatch = line.match(/^([a-dA-D])[.)]\s*(.+)/);
      
      if (optionMatch) {
        const letter = optionMatch[1].toLowerCase();
        let optionText = optionMatch[2].trim();
        
        // Check if there are more options on the same line
        const moreOptionsMatch = optionText.match(/^(.+?)\s+([b-dB-D][.)].+)$/);
        
        if (moreOptionsMatch) {
          // First option
          currentQuestion.options = currentQuestion.options || [];
          currentQuestion.options.push({
            letter,
            text: moreOptionsMatch[1].trim()
          });
          
          // Extract remaining options
          const moreOptions = extractOptions(moreOptionsMatch[2]);
          for (const opt of moreOptions) {
            if (!currentQuestion.options.find(o => o.letter === opt.letter)) {
              currentQuestion.options.push(opt);
            }
          }
        } else {
          currentQuestion.options = currentQuestion.options || [];
          // Avoid duplicates
          if (!currentQuestion.options.find(o => o.letter === letter)) {
            currentQuestion.options.push({ letter, text: optionText });
          }
        }
        continue;
      }

      // Check for Roman numeral options (I, II, III, IV) - these are sub-items, not main options
      if (line.match(/^(I{1,3}|IV|V)[.)]\s*/) || line.match(/^(I{1,3}|IV|V)\.\s*/)) {
        // Append to question text as context
        currentQuestion.question += ' ' + line;
        continue;
      }

      // Otherwise, this might be a continuation of the question or an answer line
      const answerMatch = line.match(/^(?:answer|ans|correct)[:\s]+([a-dA-D])/i);
      if (answerMatch) {
        currentQuestion.correctAnswer = answerMatch[1].toLowerCase();
        continue;
      }

      const explanationMatch = line.match(/^(?:explanation|exp|note)[:\s]+(.+)/i);
      if (explanationMatch) {
        currentQuestion.explanation = explanationMatch[1];
        continue;
      }
    }
  }

  // Don't forget the last question
  if (currentQuestion && currentQuestion.question && currentQuestion.options && currentQuestion.options.length >= 2) {
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
  
  // Sort options by letter
  if (question.options) {
    question.options.sort((a, b) => a.letter.localeCompare(b.letter));
  }
  
  // Only add if we have valid data (at least 2 options)
  if (question.question && question.options && question.options.length >= 2) {
    questions.push(question as ParsedQuestion);
  }
}
