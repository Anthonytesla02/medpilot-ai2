import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Pill, ChevronRight, Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function DrugCategoriesPreview() {
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);
  const [bestResults, setBestResults] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    const { data: drugs } = await supabase.from('drug_brands').select('category');
    if (drugs) {
      const map = new Map<string, number>();
      drugs.forEach((d: { category: string }) => map.set(d.category, (map.get(d.category) || 0) + 1));
      setCategories(Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name)));
    }

    if (user) {
      const { data: results } = await supabase
        .from('drug_practice_results')
        .select('category, percentage')
        .eq('user_id', user.id);
      if (results) {
        const best = new Map<string, number>();
        results.forEach((r: { category: string; percentage: number }) => {
          const existing = best.get(r.category);
          if (!existing || r.percentage > existing) best.set(r.category, r.percentage);
        });
        setBestResults(best);
      }
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (categories.length === 0) {
    return (
      <div className="text-center py-12">
        <Pill className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No drugs available yet</p>
        <p className="text-sm text-muted-foreground mt-1">Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-2">
        Select a category to practice matching brand names to active ingredients.
      </p>
      {categories.map((cat, index) => {
        const best = bestResults.get(cat.name);
        return (
          <motion.div
            key={cat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card
              className="cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => navigate('/drug-practice', { state: { category: cat.name } })}
            >
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${best !== undefined ? 'bg-green-500/10' : 'bg-primary/10'}`}>
                      <Pill className={`w-5 h-5 ${best !== undefined ? 'text-green-500' : 'text-primary'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{cat.name}</h3>
                      <p className="text-xs text-muted-foreground">{cat.count} drugs</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {best !== undefined && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <Trophy className="w-3 h-3 mr-1" />
                        {best.toFixed(0)}%
                      </Badge>
                    )}
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
