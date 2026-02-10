import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Upload, FileText, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const DRUG_CATEGORIES = [
  'Analgesics',
  'Antacids',
  'Anthelmintics',
  'Antibiotics',
  'Anticoagulants',
  'Antidepressants',
  'Antidiabetics',
  'Antidiarrheals',
  'Antiemetics',
  'Antiepileptics',
  'Antifungals',
  'Antihistamines',
  'Antihypertensives',
  'Anti-inflammatories',
  'Antimalarials',
  'Antiretrovirals',
  'Antispasmodics',
  'Bronchodilators',
  'Cardiovascular',
  'Corticosteroids',
  'Diuretics',
  'Hormones',
  'Laxatives',
  'Muscle Relaxants',
  'NSAIDs',
  'Sedatives',
  'Supplements',
  'Other',
];

interface DrugBrand {
  id: string;
  brand_name: string;
  active_ingredient: string;
  category: string;
  created_at: string;
}

export function DrugManager() {
  const [drugs, setDrugs] = useState<DrugBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Single add
  const [brandName, setBrandName] = useState('');
  const [activeIngredient, setActiveIngredient] = useState('');
  const [category, setCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Bulk add
  const [bulkContent, setBulkContent] = useState('');
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkParsed, setBulkParsed] = useState<{ brand_name: string; active_ingredient: string }[]>([]);
  const [bulkStep, setBulkStep] = useState<'input' | 'review'>('input');

  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchDrugs();
  }, []);

  const fetchDrugs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('drug_brands')
      .select('*')
      .order('category', { ascending: true })
      .order('brand_name', { ascending: true });

    if (!error && data) {
      setDrugs(data);
    }
    setLoading(false);
  };

  const handleAddSingle = async () => {
    if (!brandName.trim() || !activeIngredient.trim() || !category) {
      toast({ variant: 'destructive', title: 'All fields required' });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('drug_brands').insert([{
      brand_name: brandName.trim(),
      active_ingredient: activeIngredient.trim(),
      category,
      created_by: user!.id,
    }]);

    if (error) {
      toast({ variant: 'destructive', title: 'Failed to add drug', description: error.message });
    } else {
      toast({ title: 'Drug added successfully' });
      setBrandName('');
      setActiveIngredient('');
      fetchDrugs();
    }
    setSubmitting(false);
  };

  const handleParseBulk = () => {
    if (!bulkContent.trim() || !bulkCategory) {
      toast({ variant: 'destructive', title: 'Content and category required' });
      return;
    }

    const lines = bulkContent.trim().split('\n').filter(l => l.trim());
    const parsed: { brand_name: string; active_ingredient: string }[] = [];

    for (const line of lines) {
      // Support formats: "Brand - Ingredient", "Brand | Ingredient", "Brand, Ingredient", "Brand : Ingredient"
      const separators = [' - ', ' | ', ' : ', ', '];
      let found = false;
      for (const sep of separators) {
        if (line.includes(sep)) {
          const parts = line.split(sep);
          if (parts.length >= 2) {
            parsed.push({
              brand_name: parts[0].trim(),
              active_ingredient: parts.slice(1).join(sep).trim(),
            });
            found = true;
            break;
          }
        }
      }
      if (!found && line.includes('\t')) {
        const parts = line.split('\t');
        if (parts.length >= 2) {
          parsed.push({
            brand_name: parts[0].trim(),
            active_ingredient: parts[1].trim(),
          });
        }
      }
    }

    if (parsed.length === 0) {
      toast({ variant: 'destructive', title: 'Could not parse any entries', description: 'Use format: Brand - Active Ingredient (one per line)' });
      return;
    }

    setBulkParsed(parsed);
    setBulkStep('review');
  };

  const handleSubmitBulk = async () => {
    if (bulkParsed.length === 0) return;
    setSubmitting(true);

    const rows = bulkParsed.map(d => ({
      brand_name: d.brand_name,
      active_ingredient: d.active_ingredient,
      category: bulkCategory,
      created_by: user!.id,
    }));

    const { error } = await supabase.from('drug_brands').insert(rows);

    if (error) {
      toast({ variant: 'destructive', title: 'Failed to import', description: error.message });
    } else {
      toast({ title: `${rows.length} drugs imported successfully` });
      resetDialog();
      fetchDrugs();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this drug entry?')) return;
    const { error } = await supabase.from('drug_brands').delete().eq('id', id);
    if (!error) {
      fetchDrugs();
      toast({ title: 'Drug deleted' });
    }
  };

  const resetDialog = () => {
    setShowAddDialog(false);
    setBrandName('');
    setActiveIngredient('');
    setCategory('');
    setBulkContent('');
    setBulkCategory('');
    setBulkParsed([]);
    setBulkStep('input');
    setAddMode('single');
  };

  const filteredDrugs = drugs.filter(d => {
    const matchesSearch = searchQuery === '' ||
      d.brand_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.active_ingredient.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || d.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(drugs.map(d => d.category))].sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Dialog open={showAddDialog} onOpenChange={(open) => { if (!open) resetDialog(); else setShowAddDialog(true); }}>
        <DialogTrigger asChild>
          <Button className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Drugs
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Drug Brands</DialogTitle>
            <DialogDescription>Add drugs one at a time or import in bulk.</DialogDescription>
          </DialogHeader>

          <Tabs value={addMode} onValueChange={(v) => setAddMode(v as 'single' | 'bulk')}>
            <TabsList className="w-full">
              <TabsTrigger value="single" className="flex-1">
                <Plus className="w-4 h-4 mr-2" /> Single
              </TabsTrigger>
              <TabsTrigger value="bulk" className="flex-1">
                <Upload className="w-4 h-4 mr-2" /> Bulk Import
              </TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="space-y-4 mt-4">
              <div>
                <Label>Brand Name *</Label>
                <Input placeholder="e.g. Panadol" value={brandName} onChange={e => setBrandName(e.target.value)} />
              </div>
              <div>
                <Label>Active Ingredient *</Label>
                <Input placeholder="e.g. Paracetamol" value={activeIngredient} onChange={e => setActiveIngredient(e.target.value)} />
              </div>
              <div>
                <Label>Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {DRUG_CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddSingle} disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Add Drug
              </Button>
            </TabsContent>

            <TabsContent value="bulk" className="space-y-4 mt-4">
              {bulkStep === 'input' ? (
                <>
                  <div>
                    <Label>Category for all entries *</Label>
                    <Select value={bulkCategory} onValueChange={setBulkCategory}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {DRUG_CATEGORIES.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Drug Entries (one per line) *</Label>
                    <Textarea
                      placeholder={"Panadol - Paracetamol\nAmoxil - Amoxicillin\nAugmentin - Amoxicillin/Clavulanic Acid"}
                      value={bulkContent}
                      onChange={e => setBulkContent(e.target.value)}
                      className="min-h-[200px] font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Separate brand and ingredient with: - , | , : , or tab
                    </p>
                  </div>
                  <Button onClick={handleParseBulk} className="w-full">
                    <FileText className="w-4 h-4 mr-2" /> Parse Entries
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-sm text-muted-foreground">
                    Found {bulkParsed.length} entries in <Badge variant="secondary">{bulkCategory}</Badge>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Brand</TableHead>
                          <TableHead>Active Ingredient</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bulkParsed.map((d, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{d.brand_name}</TableCell>
                            <TableCell>{d.active_ingredient}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => setBulkParsed(prev => prev.filter((_, idx) => idx !== i))}>
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setBulkStep('input')} className="flex-1">Back</Button>
                    <Button onClick={handleSubmitBulk} disabled={submitting} className="flex-1">
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Import {bulkParsed.length} Drugs
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search drugs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ({drugs.length})</SelectItem>
            {categories.map(c => (
              <SelectItem key={c} value={c}>{c} ({drugs.filter(d => d.category === c).length})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Drug list */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Brand</TableHead>
              <TableHead>Ingredient</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDrugs.map(d => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.brand_name}</TableCell>
                <TableCell>{d.active_ingredient}</TableCell>
                <TableCell><Badge variant="secondary" className="text-xs">{d.category}</Badge></TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredDrugs.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  {drugs.length === 0 ? 'No drugs added yet' : 'No matching drugs'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
