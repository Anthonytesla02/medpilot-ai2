-- Add module_questions table to store generated MCQs for each module
CREATE TABLE public.module_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add unique constraint so each module has one question set
ALTER TABLE public.module_questions ADD CONSTRAINT unique_module_questions UNIQUE (module_id);

-- Enable RLS
ALTER TABLE public.module_questions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage module questions"
ON public.module_questions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view module questions"
ON public.module_questions
FOR SELECT
USING (true);

-- Add module_quiz_results table to track user quiz completion
CREATE TABLE public.module_quiz_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  percentage NUMERIC NOT NULL,
  passed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_module_quiz UNIQUE (user_id, module_id)
);

-- Enable RLS
ALTER TABLE public.module_quiz_results ENABLE ROW LEVEL SECURITY;

-- RLS policies for quiz results
CREATE POLICY "Users can insert their own quiz results"
ON public.module_quiz_results
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quiz results"
ON public.module_quiz_results
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own quiz results"
ON public.module_quiz_results
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all quiz results"
ON public.module_quiz_results
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at on module_questions
CREATE TRIGGER update_module_questions_updated_at
BEFORE UPDATE ON public.module_questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();