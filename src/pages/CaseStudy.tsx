import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Activity, ArrowLeft, ArrowUpRight, BookOpen, CheckCircle2, Clock, FlaskConical, HeartPulse, Loader2, RefreshCw, Save, Send, ShieldCheck, Sparkles, Stethoscope, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BottomNav } from '@/components/BottomNav';
import { PageLoader } from '@/components/PageLoader';
import { PatientPortrait } from '@/components/clinical/PatientPortrait';
import { MedicationOrders } from '@/components/clinical/MedicationOrders';
import { InteractionReference } from '@/components/clinical/InteractionReference';
import { ClinicalResultView } from '@/components/clinical/ClinicalResultView';
import { clinicalRequest } from '@/lib/clinical/api';
import type { SessionData, LibraryCase, Decisions, ClinicalResult, Attempt } from '@/lib/clinical/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import LegacyCaseStudy from './LegacyCaseStudy';

export default function CaseStudy() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate(); const [params, setParams] = useSearchParams(); const { toast } = useToast();
  const [cases, setCases] = useState<LibraryCase[]>([]); const [session, setSession] = useState<SessionData | null>(null);
  const [mode, setMode] = useState('learning'); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [tab, setTab] = useState('encounter'); const [legacy, setLegacy] = useState(false); const [tick, setTick] = useState(Date.now()); const [saved, setSaved] = useState(true);
  const submissionKey = useRef(crypto.randomUUID()); const attemptId = params.get('attempt');
  const [refresh, setRefresh] = useState(0);
  const pendingLibrary = useRef<Promise<{ cases: LibraryCase[] }> | null>(null);
  useEffect(() => { if (!authLoading && !user) navigate('/auth'); }, [authLoading, user, navigate]);
  useEffect(() => {
    if (!user) return;
    let active = true; setLoading(true); setError('');
    const load = async () => { try {
      if (attemptId) { const data = await clinicalRequest<SessionData>({ action: 'load', attemptId }); if (active) { setSession(data); setSaved(true); setTab('encounter'); } }
      else { pendingLibrary.current ??= clinicalRequest<{ cases: LibraryCase[] }>({ action: 'library' }); const data = await pendingLibrary.current; if (active) { setCases(data.cases); setSession(null); } }
    } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Could not load cases.'); } finally { if (active) setLoading(false); } };
    load(); return () => { active = false; };
  }, [user, attemptId, refresh]);
  useEffect(() => { const timer = setInterval(() => setTick(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const remaining = session?.attempt.deadline_at ? Math.max(0, Math.ceil((new Date(session.attempt.deadline_at).getTime() - tick) / 1000)) : null;
  const expired = remaining === 0; const disabled = busy || expired || session?.attempt.status === 'completed';
  const failure = (e: unknown) => { setError(e instanceof Error ? e.message : 'Request failed. Please try again.'); };
  const start = async (key: string) => { setBusy(true); setError(''); try { const data = await clinicalRequest<SessionData>({ action: 'start', caseKey: key, mode }); setSession(data); submissionKey.current = crypto.randomUUID(); setParams({ attempt: data.attempt.id }); } catch (e) { failure(e); } finally { setBusy(false); } };
  const update = (decisions: Decisions) => { setSession(s => s ? { ...s, attempt: { ...s.attempt, decisions } } : s); setSaved(false); };
  const save = async () => { if (!session) return; setBusy(true); setError(''); try { const data = await clinicalRequest<{ attempt: Attempt }>({ action: 'save', attemptId: session.attempt.id, revision: session.attempt.revision, decisions: session.attempt.decisions }); setSession(s => s ? { ...s, attempt: data.attempt } : s); setSaved(true); toast({ title: 'Encounter saved' }); } catch (e) { failure(e); } finally { setBusy(false); } };
  const event = async (kind: string, id: string) => { if (!session) return; setBusy(true); setError(''); try {
    // Persist typed decisions before recording a server-timed clinical action.
    let current = session.attempt;
    if (!saved) { const savedData = await clinicalRequest<{ attempt: Attempt }>({ action: 'save', attemptId: current.id, revision: current.revision, decisions: current.decisions }); current = savedData.attempt; }
    const data = await clinicalRequest<{ attempt: Attempt; answer?: string; rationale?: string }>({ action: 'event', attemptId: current.id, eventKind: kind, eventId: id });
    setSession(s => s ? { ...s, attempt: data.attempt, encounter: { ...s.encounter, findings: s.encounter.findings.map(f => f.id === id && data.answer ? { ...f, answer: data.answer } : f) } } : s); setSaved(true);
  } catch (e) { failure(e); } finally { setBusy(false); } };
  const submit = async () => { if (!session) return; setBusy(true); setError(''); try {
    let current = session.attempt;
    if (!expired && !saved) { const savedData = await clinicalRequest<{ attempt: Attempt }>({ action: 'save', attemptId: current.id, revision: current.revision, decisions: current.decisions }); current = savedData.attempt; setSession(s => s ? { ...s, attempt: current } : s); setSaved(true); }
    const data = await clinicalRequest<{ result: ClinicalResult }>({ action: 'submit', attemptId: current.id, revision: current.revision, decisions: current.decisions, submissionKey: submissionKey.current }); setSession(s => s ? { ...s, attempt: { ...s.attempt, status: 'completed', result: data.result } } : s); setSaved(true);
  } catch (e) { failure(e); } finally { setBusy(false); } };
  const refreshCases = () => { pendingLibrary.current = null; setCases([]); setRefresh(n => n + 1); };
  const library = () => { if (!saved && !window.confirm('Leave this encounter without saving your latest entries?')) return; pendingLibrary.current = null; setParams({}); setSession(null); };
  if (legacy) return <><div className="p-3 border-b border-border flex flex-wrap items-center justify-between gap-2"><Button variant="ghost" onClick={() => setLegacy(false)}><ArrowLeft className="h-4 w-4 mr-2" />Clinical encounters</Button><Badge variant="outline">AI draft · provisional feedback · no verified points</Badge></div><LegacyCaseStudy /></>;
  if (authLoading) return <PageLoader />;
  if (loading) return <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p role="status" className="text-sm text-muted-foreground">{attemptId ? 'Loading your encounter…' : 'Generating a fresh case study…'}</p></div>;
  if (!user) return null;
  const recorded = (kind: string, id: string) => !!session?.attempt.events.some(e => e.id === id && e.kind === kind);
  return <div className="min-h-screen bg-background pb-24">
    <header className="border-b border-border bg-background sticky top-0 z-30"><div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between gap-3"><div className="flex items-center gap-3"><Stethoscope className="h-6 w-6 text-primary" /><div><p className="font-bold">Med Pilot AI</p><p className="text-xs text-muted-foreground">Clinical simulation</p></div></div><Button variant="ghost" size="sm" onClick={() => navigate('/profile?tab=clinical')}><UserRound className="h-4 w-4 mr-2" /><span className="hidden sm:inline">Identity Profile</span></Button></div></header>
    <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
      {error && <div role="alert" className="border-l-2 border-destructive p-3 mb-5 text-sm text-destructive flex flex-wrap gap-3 items-center">{error}<Button variant="outline" size="sm" onClick={() => attemptId ? window.location.reload() : refreshCases()}>Try again</Button></div>}
      {!session ? <>
        <div className="flex flex-wrap justify-between items-end gap-4 mb-7"><div><p className="text-xs uppercase text-primary mb-2">Practice / Case studies</p><h1 className="text-3xl font-bold">Clinical encounters</h1><p className="text-sm text-muted-foreground mt-2">Synthetic patients · AI drafts · educational use only</p></div><div className="flex flex-wrap gap-3"><Button variant="outline" onClick={refreshCases} disabled={busy}><RefreshCw className="h-4 w-4 mr-2" />New case</Button><Tabs value={mode} onValueChange={setMode}><TabsList><TabsTrigger value="learning">Learning</TabsTrigger><TabsTrigger value="challenge">Challenge</TabsTrigger></TabsList></Tabs></div></div>
        <Tabs defaultValue="cases"><TabsList className="mb-6"><TabsTrigger value="cases"><Stethoscope className="h-4 w-4 mr-2" />Cases</TabsTrigger><TabsTrigger value="references"><ShieldCheck className="h-4 w-4 mr-2" />Interactions</TabsTrigger></TabsList>
          <TabsContent value="cases"><div className="grid max-w-sm gap-5">{cases.map(c => <article key={c.id} className="border border-border rounded-lg overflow-hidden bg-card flex flex-col"><div className="relative aspect-[4/3] bg-muted"><PatientPortrait avatar={c.characters.find(x => x.primary)?.avatar ?? 'woman'} age={c.characters.find(x => x.primary)?.age} name={c.characters.find(x => x.primary)?.name ?? 'Patient'} className="w-full h-full" /><Badge variant="secondary" className="absolute top-3 left-3">{c.specialty}</Badge>{c.emergency && <Clock className="h-5 w-5 absolute right-3 top-3 text-primary" />}</div><div className="p-4 flex flex-col flex-1"><p className="text-xs text-muted-foreground capitalize">{c.difficulty} · Review pending</p><h2 className="font-semibold text-lg mt-2">{c.title}</h2><p className="text-sm text-muted-foreground mt-1">{c.characters.map(x => `${x.name}, ${x.age}`).join(' & ')}</p><Button className="mt-5 w-full justify-between" variant="outline" disabled={busy} onClick={() => start(c.key)}>Open encounter<ArrowUpRight className="h-4 w-4" /></Button></div></article>)}</div><div className="mt-8 py-5 border-t border-border flex flex-wrap gap-3 items-center justify-between"><p className="text-xs text-muted-foreground max-w-xl">Clinical review is pending. Draft cases save learning feedback but do not award competitive points or verified badges.</p><Button variant="ghost" onClick={() => setLegacy(true)}><Sparkles className="h-4 w-4 mr-2" />AI-generated cases</Button></div></TabsContent>
          <TabsContent value="references"><InteractionReference /></TabsContent>
        </Tabs>
      </> : <>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5"><Button variant="ghost" size="sm" className="-ml-3" onClick={library}><ArrowLeft className="h-4 w-4 mr-2" />Case library</Button><div className="flex gap-2 items-center"><Badge variant="outline" className="capitalize">{session.attempt.mode}</Badge><Badge variant="secondary">Review pending</Badge>{remaining !== null && <Badge variant={expired ? 'destructive' : 'outline'}><Clock className="h-3 w-3 mr-1" />{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</Badge>}</div></div>
        <h1 className="text-2xl font-bold mb-2">{session.title}</h1><p className="text-xs text-muted-foreground mb-6">Educational simulation, not real prescribing or diagnostic advice.{remaining !== null && ' The countdown is a learning challenge setting, not a clinical waiting interval.'}</p>
        {session.attempt.result ? <ClinicalResultView result={session.attempt.result} onRetry={() => start(session.caseKey)} onLibrary={library} onProfile={() => navigate('/profile?tab=clinical')} /> : <div className="grid lg:grid-cols-[290px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)] gap-8">
          <aside className="space-y-6"><div className="flex gap-4 items-center lg:block">{session.encounter.characters.filter(c => c.primary).map(c => <div key={c.id} className="flex gap-4 items-center lg:block"><PatientPortrait avatar={c.avatar} age={c.age} name={c.name} className="w-24 h-24 lg:w-full lg:h-auto lg:aspect-[4/3] rounded-lg" /><div className="lg:mt-3"><h2 className="font-semibold text-lg">{c.name}</h2><p className="text-sm text-muted-foreground">{c.age} years · {c.role}</p></div></div>)}</div>
            {session.encounter.characters.filter(c => !c.primary).map(c => <div key={c.id} className="flex items-center gap-3 border-t border-border pt-3"><PatientPortrait avatar={c.avatar} age={c.age} name={c.name} className="w-12 h-12 rounded-md" /><div><p className="text-sm font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{c.role} · {c.age} years · accompanying</p></div></div>)}
            <section><h3 className="text-xs uppercase text-muted-foreground mb-3 flex gap-2 items-center"><HeartPulse className="h-4 w-4 text-primary" />Observations</h3><dl className="grid grid-cols-2 gap-3">{Object.entries(session.encounter.vitals).map(([k, v]) => <div key={k} className="border-l-2 border-border pl-3"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="text-sm font-semibold mt-1">{v}</dd></div>)}</dl></section>
            {[['Current medicines', session.encounter.currentMedications], ['Allergies', session.encounter.allergies], ['History', session.encounter.history]].map(([label, values]) => <section key={String(label)} className="border-t border-border pt-4"><h3 className="font-medium text-sm mb-2">{String(label)}</h3><p className="text-sm text-muted-foreground capitalize">{(values as string[]).join(', ') || 'None reported'}</p></section>)}
          </aside>
          <div className="min-w-0"><Tabs value={tab} onValueChange={setTab}><TabsList className="w-full grid grid-cols-3 mb-6"><TabsTrigger value="encounter"><Stethoscope className="h-4 w-4 mr-1" />Encounter</TabsTrigger><TabsTrigger value="treatment"><Activity className="h-4 w-4 mr-1" />Treatment</TabsTrigger><TabsTrigger value="references"><BookOpen className="h-4 w-4 mr-1" />Evidence</TabsTrigger></TabsList>
            <TabsContent value="encounter" className="space-y-6"><section><h2 className="font-semibold text-lg mb-2">{session.encounter.complaint}</h2><p className="leading-relaxed text-muted-foreground">{session.encounter.narrative}</p><div className="flex flex-wrap gap-2 mt-4">{session.encounter.symptoms.map(s => <Badge key={s} variant="secondary">{s}</Badge>)}</div></section>
              <section className="border-t border-border pt-5"><h3 className="font-semibold mb-4 flex items-center gap-2"><FlaskConical className="h-4 w-4 text-primary" />History, examination and investigations</h3><div className="space-y-3">{session.encounter.findings.map(f => <div key={f.id}><Button className="w-full justify-between h-auto py-3 whitespace-normal text-left" variant="outline" disabled={disabled || recorded('finding', f.id)} onClick={() => event('finding', f.id)}>{f.label}{recorded('finding', f.id) ? <CheckCircle2 className="h-4 w-4 shrink-0 text-primary ml-2" /> : <ArrowUpRight className="h-4 w-4 ml-2 shrink-0" />}</Button>{f.answer && <p className="text-sm text-muted-foreground p-3 border-l-2 border-primary mt-2">{f.answer}</p>}</div>)}</div></section>
              <section className="space-y-4 border-t border-border pt-5"><div><Label htmlFor="primary-diagnosis">Primary diagnosis</Label><Input id="primary-diagnosis" placeholder="Enter your working diagnosis…" value={session.attempt.decisions.diagnosis} disabled={disabled} onChange={e => update({ ...session.attempt.decisions, diagnosis: e.target.value })} /></div><div><Label htmlFor="differentials">Differential diagnoses and reasoning</Label><Textarea id="differentials" value={session.attempt.decisions.differentials} disabled={disabled} onChange={e => update({ ...session.attempt.decisions, differentials: e.target.value })} placeholder="Alternative diagnoses and your reasoning…" /></div></section>
            </TabsContent>
            <TabsContent value="treatment" className="space-y-7"><section><h3 className="font-semibold mb-4">Management decisions</h3><div className="space-y-3">{session.encounter.actions.map(a => <Button key={a.id} variant="outline" className="w-full justify-between h-auto py-3 whitespace-normal text-left" disabled={disabled || recorded('action', a.id)} onClick={() => event('action', a.id)}>{a.label}{recorded('action', a.id) ? <CheckCircle2 className="h-4 w-4 shrink-0 ml-3 text-primary" /> : <ArrowUpRight className="h-4 w-4 shrink-0 ml-3" />}</Button>)}</div></section>
              {session.encounter.procedures.length > 0 && <section className="border-t border-border pt-5"><h3 className="font-semibold mb-4">Procedural care</h3><p className="text-xs text-muted-foreground mb-3">Available supplies: clean water, clean cloth, gloves and sterile dressing.</p><div className="space-y-3">{session.encounter.procedures.map(p => <div key={p.id}><Button variant="outline" className="w-full justify-between h-auto py-3 whitespace-normal text-left" disabled={disabled || recorded('procedure', p.id)} onClick={() => event('procedure', p.id)}>{p.label}{recorded('procedure', p.id) ? <CheckCircle2 className="h-4 w-4 shrink-0 ml-2" /> : <ArrowUpRight className="h-4 w-4 shrink-0 ml-2" />}</Button>{session.attempt.mode === 'learning' && recorded('procedure', p.id) && <p className="text-xs text-muted-foreground mt-2 pl-3 border-l-2 border-primary">{p.rationale}</p>}</div>)}</div><ol className="text-xs text-muted-foreground mt-4 space-y-1">{session.attempt.events.filter(e => e.kind === 'procedure').map((e, i) => <li key={e.id}>{i + 1}. {session.encounter.procedures.find(p => p.id === e.id)?.label}</li>)}</ol></section>}
              <section className="border-t border-border pt-5"><h3 className="font-semibold mb-4">Medication orders</h3><MedicationOrders attemptId={session.attempt.id} decisions={session.attempt.decisions} onChange={update} disabled={!!disabled} /></section>
            </TabsContent>
            <TabsContent value="references"><h3 className="font-semibold mb-3">Case sources</h3><div className="space-y-2 mb-6">{session.encounter.sources.map(s => <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="block text-sm text-primary underline">{s.name}</a>)}</div><InteractionReference /></TabsContent>
          </Tabs>
          {expired && <p role="alert" className="text-sm text-destructive mt-6">The challenge deadline has passed. Only decisions saved before the deadline will be evaluated.</p>}
          <div className="border-t border-border pt-5 mt-7 flex flex-wrap items-center gap-3"><Button variant="outline" disabled={disabled || saved} onClick={save}><Save className="h-4 w-4 mr-2" />Save encounter</Button><span className="text-xs text-muted-foreground flex-1">{saved ? 'Saved' : 'Unsaved entries'}</span><Button disabled={busy} onClick={submit}>{busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}Complete encounter</Button></div>
          </div>
        </div>}
      </>}
    </main><BottomNav />
  </div>;
}
