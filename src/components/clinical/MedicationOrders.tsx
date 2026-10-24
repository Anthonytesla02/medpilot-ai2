import { useEffect, useState } from 'react';
import { Plus, Trash2, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { clinicalRequest } from '@/lib/clinical/api';
import type { Decisions, Order, SafetyResult } from '@/lib/clinical/types';
import { drugInteractionReferences } from '@/data/drugInteractions';
const referenceIngredients = [...new Set(drugInteractionReferences.flatMap(r => [...r.ingredients]))];
export function MedicationOrders({ attemptId, decisions, onChange, disabled }: { attemptId: string; decisions: Decisions; onChange: (d: Decisions) => void; disabled: boolean }) {
  const [catalog, setCatalog] = useState<{ brand_name: string; active_ingredient: string }[]>([]);
  const [search, setSearch] = useState('');
  const [ingredient, setIngredient] = useState('');
  const [dose, setDose] = useState(''); const [route, setRoute] = useState(''); const [frequency, setFrequency] = useState(''); const [duration, setDuration] = useState('');
  const [safety, setSafety] = useState<SafetyResult | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => { supabase.from('drug_brands').select('brand_name, active_ingredient').then(({ data }) => setCatalog(data ?? [])); }, []);
  const candidates = [...referenceIngredients.map(i => ({ label: i, value: i })), ...catalog.map(c => ({ label: `${c.brand_name} · ${c.active_ingredient}`, value: c.active_ingredient }))].filter(c => c.label.toLowerCase().includes(search.toLowerCase())).slice(0, 8);
  const update = (orders: Order[]) => { onChange({ ...decisions, orders }); setSafety(null); setError(''); };
  const check = async () => { setBusy(true); setError(''); try { setSafety(await clinicalRequest<SafetyResult>({ action: 'check', attemptId, decisions })); } catch (e) { setError(e instanceof Error ? e.message : 'Safety check failed.'); } finally { setBusy(false); } };
  return <div className="space-y-5">
    <p className="text-sm text-muted-foreground">Educational orders only. Doses, routes and schedules are unvalidated unless a reviewed case explicitly supports them.</p>
    <div className="space-y-2"><Label htmlFor="medicine-search">Brand or active ingredient</Label><Input id="medicine-search" value={search} disabled={disabled} onChange={e => { setSearch(e.target.value); setIngredient(''); }} placeholder="Search medicines…" />
      {search && !ingredient && <div className="border border-border rounded-md divide-y divide-border">{candidates.map(c => <Button variant="ghost" key={c.label} disabled={disabled} className="w-full justify-start rounded-none h-auto py-2 whitespace-normal text-left capitalize" onClick={() => { setIngredient(c.value); setSearch(c.label); }}>{c.label}</Button>)}{!candidates.length && <p className="p-3 text-sm text-muted-foreground">No catalog match. This ingredient is not supported by the current references.</p>}</div>}
    </div>
    <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="order-dose">Dose and units</Label><Input id="order-dose" value={dose} disabled={disabled} onChange={e => setDose(e.target.value)} placeholder="Not validated" /></div><div><Label>Route</Label><Select value={route} onValueChange={setRoute} disabled={disabled}><SelectTrigger aria-label="Medication route"><SelectValue placeholder="Select route" /></SelectTrigger><SelectContent>{['oral', 'IM', 'IV', 'topical', 'inhaled'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div><div><Label htmlFor="order-frequency">Frequency</Label><Input id="order-frequency" value={frequency} disabled={disabled} onChange={e => setFrequency(e.target.value)} placeholder="Not validated" /></div><div><Label htmlFor="order-duration">Duration</Label><Input id="order-duration" value={duration} disabled={disabled} onChange={e => setDuration(e.target.value)} placeholder="Not validated" /></div></div>
    <Button variant="outline" disabled={!ingredient || disabled} onClick={() => { update([...decisions.orders, { id: crypto.randomUUID(), ingredient, dose, route, frequency, duration, status: 'prescribed', acknowledged: false }]); setIngredient(''); setSearch(''); setDose(''); setRoute(''); setFrequency(''); setDuration(''); }}><Plus className="mr-2 h-4 w-4" />Add prescription</Button>
    <div className="divide-y divide-border">{decisions.orders.map(o => <div key={o.id} className="py-4 space-y-3"><div className="flex items-start justify-between gap-2"><div><p className="font-medium capitalize">{o.ingredient}</p><p className="text-xs text-muted-foreground">{[o.dose, o.route, o.frequency, o.duration].filter(Boolean).join(' · ') || 'Medication details unspecified'} · {o.status}</p></div><Button variant="ghost" size="icon" title="Remove order" aria-label={`Remove ${o.ingredient}`} disabled={disabled} onClick={() => update(decisions.orders.filter(x => x.id !== o.id))}><Trash2 className="h-4 w-4" /></Button></div>
      {o.status === 'prescribed' && <><label className="flex gap-2 items-start text-xs text-muted-foreground"><Checkbox checked={o.acknowledged} disabled={disabled} onCheckedChange={v => update(decisions.orders.map(x => x.id === o.id ? { ...x, acknowledged: v === true } : x))} />I acknowledge the coverage and dose-validation limitations.</label><Button size="sm" variant="outline" disabled={disabled || !o.acknowledged || !safety} onClick={() => update(decisions.orders.map(x => x.id === o.id ? { ...x, status: 'administered' } : x))}><CheckCircle2 className="h-4 w-4 mr-2" />Record simulated administration</Button></>}
    </div>)}</div>
    <Button variant="secondary" disabled={busy || !decisions.orders.length || disabled} onClick={check}><ShieldCheck className="h-4 w-4 mr-2" />{busy ? 'Checking…' : 'Check medication safety'}</Button>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {safety && <div className="space-y-3 border-l-2 border-primary pl-4"><p className="text-xs font-medium">Source-backed check · clinical review pending</p>{safety.alerts.map(a => <div key={a.id} className="space-y-1"><p className="font-medium text-sm flex items-start gap-2"><AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />{a.category}: {a.risk}</p><p className="text-xs text-muted-foreground">{a.precaution}</p>{a.sourceUrl && <a href={a.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">Source</a>}</div>)}{!safety.alerts.length && <p className="text-sm">No listed alert found. This is not confirmation of safety.</p>}{safety.unknownPairs.length > 0 && <p className="text-sm text-muted-foreground">Not covered by this reference set: {safety.unknownPairs.join('; ')}.</p>}<p className="text-xs text-muted-foreground">{safety.doseValidation}</p></div>}
  </div>;
}