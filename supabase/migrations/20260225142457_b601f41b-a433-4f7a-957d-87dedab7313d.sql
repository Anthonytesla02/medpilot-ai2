
CREATE TABLE public.bnf_knowledge_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  section TEXT,
  page_number INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bnf_knowledge_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read BNF knowledge chunks"
  ON public.bnf_knowledge_chunks
  FOR SELECT
  USING (true);
