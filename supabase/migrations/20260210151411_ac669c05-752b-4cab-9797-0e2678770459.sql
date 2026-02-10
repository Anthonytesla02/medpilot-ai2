
-- Drug brands table for storing brand-ingredient pairs with categories
CREATE TABLE public.drug_brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_name TEXT NOT NULL,
  active_ingredient TEXT NOT NULL,
  category TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Drug practice results
CREATE TABLE public.drug_practice_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  percentage NUMERIC NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.drug_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drug_practice_results ENABLE ROW LEVEL SECURITY;

-- Drug brands policies
CREATE POLICY "Anyone can view drug brands" ON public.drug_brands FOR SELECT USING (true);
CREATE POLICY "Admins can manage drug brands" ON public.drug_brands FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Drug practice results policies
CREATE POLICY "Users can view their own results" ON public.drug_practice_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own results" ON public.drug_practice_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all results" ON public.drug_practice_results FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_drug_brands_updated_at
  BEFORE UPDATE ON public.drug_brands
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
