import { useState } from 'react';
import { Search, ExternalLink, ShieldAlert } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { drugInteractionReferences } from '@/data/drugInteractions';
export function InteractionReference() {
  const [query, setQuery] = useState('');
  const results = drugInteractionReferences.filter(r => `${r.ingredients.join(' ')} ${r.risk}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="space-y-5">
    <div className="flex items-start gap-3"><ShieldAlert className="h-5 w-5 shrink-0 text-primary" /><div><h2 className="font-semibold">Interaction references</h2><p className="text-sm text-muted-foreground">10 sourced examples · clinical review pending · not a complete safety database</p></div></div>
    <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search interaction references" placeholder="Search an active ingredient or risk…" className="pl-9" value={query} onChange={e => setQuery(e.target.value)} /></div>
    {!results.length && <p className="py-8 text-center text-muted-foreground">Not covered by this reference set.</p>}
    <div className="divide-y divide-border">{results.map(r => <article key={r.id} className="py-5 space-y-2"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold capitalize">{r.ingredients.join(' + ')}</h3><Badge variant="outline">{r.category}</Badge></div><p className="text-sm">{r.risk}</p><p className="text-sm text-muted-foreground">{r.precaution}</p><p className="text-xs text-muted-foreground">{r.scope}</p><a className="inline-flex items-center gap-1 text-xs text-primary underline" href={r.sourceUrl} target="_blank" rel="noopener noreferrer">{r.sourceName}<ExternalLink className="h-3 w-3" /></a><p className="text-xs text-muted-foreground">Retrieved {r.retrievedOn} · Sourced, awaiting clinical review</p></article>)}</div>
  </section>;
}