import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, ArrowUpRight, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { clinicalRequest } from '@/lib/clinical/api';
import type { ClinicalResult } from '@/lib/clinical/types';
interface HistoryAttempt { id: string; mode: string; status: string; title: string; specialty: string; started_at: string; completed_at: string | null; result: ClinicalResult | null }
interface ProfileData { attempts: HistoryAttempt[]; badges: { awarded_at: string; clinical_badge_definitions: { name: string; description: string; rarity: string } }[] }
export function ClinicalProfile() {
  const [data, setData] = useState<ProfileData | null>(null); const [error, setError] = useState(''); const navigate = useNavigate();
  const load = () => { setError(''); clinicalRequest<ProfileData>({ action: 'profile' }).then(setData).catch(e => setError(e.message)); };
  useEffect(load, []);
  if (error) return <div role="alert" className="py-6 space-y-3"><p className="text-sm text-destructive">{error}</p><Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4 mr-2" />Retry</Button></div>;
  if (!data) return <p className="text-sm text-muted-foreground py-8">Loading clinical profile…</p>;
  const completed = data.attempts.filter(a => a.result && a.status === 'completed');
  const avg = completed.length ? Math.round(completed.reduce((s, a) => s + (a.result?.score ?? 0), 0) / completed.length) : 0;
  const verified = completed.filter(a => a.result?.eligible);
  const challenge = verified.filter(a => a.mode === 'challenge');
  const skills = [...new Set(completed.flatMap(a => a.result?.dimensions.map(d => d.name) ?? []))].map(name => { const values = completed.flatMap(a => a.result?.dimensions.filter(d => d.name === name).map(d => d.score) ?? []); return { name, score: Math.round(values.reduce((s, n) => s + n, 0) / values.length) }; });
  const specialties = [...new Set(completed.map(a => a.specialty))].map(name => { const rows = completed.filter(a => a.specialty === name); return { name, score: Math.round(rows.reduce((s, a) => s + (a.result?.score ?? 0), 0) / rows.length) }; });
  const dates = [...new Set(completed.map(a => a.completed_at?.slice(0, 10)).filter((d): d is string => !!d))].sort();
  let best = 0; let run = 0; let previous = 0;
  dates.forEach(d => { const day = Date.parse(d) / 86400000; run = day - previous === 1 ? run + 1 : 1; best = Math.max(best, run); previous = day; });
  const today = Math.floor(Date.now() / 86400000); const currentStreak = today - previous <= 1 ? run : 0;
  const errors = completed.flatMap(a => (a.result?.criticalErrors ?? []).map(text => ({ text, id: a.id, title: a.title })));
  const chronological = [...completed].reverse(); const recent = chronological.slice(-5); const earlier = chronological.slice(0, -5);
  const change = recent.length && earlier.length ? Math.round(recent.reduce((s, a) => s + (a.result?.score ?? 0), 0) / recent.length - earlier.reduce((s, a) => s + (a.result?.score ?? 0), 0) / earlier.length) : null;
  return <section className="space-y-7 py-3">
    <div><h2 className="font-semibold text-xl">Clinical Identity Profile</h2><p className="text-xs text-muted-foreground mt-2">Draft-case scores are provisional learning feedback. Only clinically reviewed results contribute to verified challenge rating and achievements.</p></div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">{[['Attempted', data.attempts.length], ['Completed', completed.length], ['Learning average', `${avg}%`], ['Challenge rating', challenge.length ? `${Math.round(challenge.reduce((s, a) => s + (a.result?.points ?? 0), 0) / challenge.length)}` : 'Unrated'], ['Current streak', `${currentStreak} days`], ['Best streak', `${best} days`], ['Verified cases', verified.length], ['Improvement', change === null ? '—' : `${change > 0 ? '+' : ''}${change} points`]].map(([label, value]) => <div key={label} className="border-l-2 border-primary pl-3"><p className="text-xl font-bold">{value}</p><p className="text-xs text-muted-foreground mt-1">{label}</p></div>)}</div>
    <section><h3 className="font-semibold mb-4">Learning skills</h3>{!skills.length && <p className="text-sm text-muted-foreground">No completed encounters yet.</p>}<div className="grid sm:grid-cols-2 gap-5">{skills.sort((a, b) => b.score - a.score).map(s => <div key={s.name}><div className="flex justify-between text-sm mb-2"><span>{s.name}</span><span>{s.score}%</span></div><Progress value={s.score} /><p className="text-xs text-muted-foreground mt-1">{s.score >= 80 ? 'Strongest skill area' : 'Further practice suggested'}</p></div>)}</div></section>
    {specialties.length > 0 && <section><h3 className="font-semibold mb-3">Specialty performance</h3><div className="divide-y divide-border">{specialties.map(s => <div key={s.name} className="py-3 flex justify-between text-sm"><span>{s.name}</span><span>{s.score}%</span></div>)}</div></section>}
    <section><h3 className="font-semibold flex items-center gap-2 mb-3"><Award className="h-4 w-4 text-primary" />Verified achievements</h3>{!data.badges.length ? <p className="text-sm text-muted-foreground">No verified badges yet. Clinically reviewed cases are required.</p> : <div className="grid sm:grid-cols-2 gap-3">{data.badges.map(b => <article key={b.clinical_badge_definitions.name} className="border border-border rounded-md p-4"><p className="font-semibold">{b.clinical_badge_definitions.name}</p><p className="text-xs text-muted-foreground mt-1">{b.clinical_badge_definitions.description}</p><p className="text-xs text-muted-foreground mt-2">{b.clinical_badge_definitions.rarity} · {new Date(b.awarded_at).toLocaleDateString()}</p></article>)}</div>}</section>
    {errors.length > 0 && <section><h3 className="font-semibold flex items-center gap-2 mb-3"><ShieldAlert className="h-4 w-4 text-destructive" />Safety review history</h3><div className="divide-y divide-border">{errors.map((e, i) => <div key={`${e.id}-${i}`} className="py-3"><p className="text-xs text-muted-foreground">{e.title}</p><p className="text-sm mt-1">{e.text}</p></div>)}</div></section>}
    <section><h3 className="font-semibold mb-3">Encounter history</h3>{!data.attempts.length && <Button variant="outline" onClick={() => navigate('/cases')}>Open case library<ArrowUpRight className="h-4 w-4 ml-2" /></Button>}<div className="divide-y divide-border">{data.attempts.map(a => <Button key={a.id} variant="ghost" className="w-full h-auto py-4 px-0 justify-between text-left gap-3 whitespace-normal" onClick={() => navigate(`/cases?attempt=${a.id}`)}><div><p className="font-medium">{a.title}</p><p className="text-xs text-muted-foreground mt-1 capitalize">{a.mode} · {new Date(a.started_at).toLocaleDateString()} · {a.status.replace('_', ' ')}</p></div><span className="flex items-center gap-2 shrink-0">{a.result ? `${a.result.score}%` : 'Resume'}<ArrowUpRight className="h-4 w-4" /></span></Button>)}</div></section>
  </section>;
}