import { useMemo, useState, type ReactNode } from 'react';
import {
  Activity, AlertTriangle, ArrowUpRight, Award, BookOpen, Check, Clock3,
  Crosshair, HeartPulse, Play, RefreshCw, ShieldCheck, Stethoscope, UserRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MedicationOrders } from '@/components/clinical/MedicationOrders';
import { PatientPortrait } from '@/components/clinical/PatientPortrait';
import type { BodyRegion, ChallengeCategory, Decisions, LibraryCase, SessionData } from '@/lib/clinical/types';

type ProfileAttempt = {
  id: string;
  mode: string;
  status: string;
  title: string;
  specialty: string;
  started_at: string;
  completed_at: string | null;
  result: { score: number; points: number; eligible: boolean } | null;
};

type BadgeRecord = { awarded_at: string; clinical_badge_definitions: { name: string; description: string; rarity: string } };

const categoryInfo: Record<ChallengeCategory, { title: string; short: string; icon: typeof Activity }> = {
  trauma: { title: 'Trauma & injuries', short: 'Trauma', icon: Crosshair },
  medical_emergency: { title: 'Acute emergencies', short: 'Emergency', icon: HeartPulse },
  medication_emergency: { title: 'Medication safety', short: 'Medication', icon: ShieldCheck },
};

const difficultyLabel: Record<string, string> = { easy: 'Beginner', medium: 'Intermediate', hard: 'Advanced' };
const categoryOrder: ChallengeCategory[] = ['trauma', 'medical_emergency', 'medication_emergency'];

export function ChallengeDashboard({
  cases,
  attempts,
  badges,
  loading,
  onStart,
  onResume,
  onRefresh,
}: {
  cases: LibraryCase[];
  attempts: ProfileAttempt[];
  badges: BadgeRecord[];
  loading: boolean;
  onStart: (caseKey: string) => void;
  onResume: (attemptId: string) => void;
  onRefresh: () => void;
}) {
  const [category, setCategory] = useState<ChallengeCategory | 'all'>('all');
  const [difficulty, setDifficulty] = useState('all');
  const challengeAttempts = attempts.filter(attempt => attempt.mode === 'challenge');
  const completed = challengeAttempts.filter(attempt => attempt.status === 'completed' && attempt.result);
  const verified = completed.filter(attempt => attempt.result?.eligible);
  const unfinished = challengeAttempts.find(attempt => attempt.status === 'in_progress');
  const filtered = cases.filter(item =>
    (category === 'all' || item.category === category) &&
    (difficulty === 'all' || (difficulty === 'expert' ? item.difficulty === 'expert' : item.difficulty === difficulty)),
  );
  const dailyIndex = Math.floor(Date.now() / 86_400_000) % Math.max(cases.length, 1);
  const weeklyIndex = Math.floor(Date.now() / (86_400_000 * 7)) % Math.max(cases.length, 1);
  const daily = cases[dailyIndex];
  const weekly = cases[weeklyIndex];
  const mastery = categoryOrder.map(key => {
    const categoryCases = cases.filter(item => item.category === key);
    const specialtyNames = new Set(categoryCases.map(item => item.specialty));
    const results = completed.filter(attempt => specialtyNames.has(attempt.specialty));
    return { key, count: categoryCases.length, score: results.length ? Math.round(results.reduce((sum, item) => sum + (item.result?.score ?? 0), 0) / results.length) : null };
  });
  const randomCase = () => {
    if (cases.length) onStart(cases[Math.floor(Math.random() * cases.length)].key);
  };

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-3xl border border-teal-300/15 bg-[radial-gradient(ellipse_at_top_right,_rgba(45,212,191,0.18),_transparent_55%),linear-gradient(145deg,#122327,#0d1719)] p-5 sm:p-8">
        <div className="absolute -right-10 -top-12 h-48 w-48 rounded-full border border-teal-200/10" />
        <div className="relative max-w-2xl">
          <Badge className="border border-teal-200/20 bg-teal-300/10 text-teal-100 hover:bg-teal-300/10">INTERACTIVE PRACTICE</Badge>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">Step into the case.</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
            Inspect a synthetic patient, choose a safe next action, and see how your recorded decisions are evaluated.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {unfinished && <Button onClick={() => onResume(unfinished.id)} className="min-h-12 bg-teal-400 text-slate-950 hover:bg-teal-300"><Play className="mr-2 h-4 w-4" />Continue challenge</Button>}
            {cases[0] && <Button variant="outline" onClick={() => onStart((daily ?? cases[0]).key)} className="min-h-12 border-white/20 bg-white/5 text-white hover:bg-white/10"><Stethoscope className="mr-2 h-4 w-4" />Start challenge</Button>}
            <Button variant="ghost" onClick={randomCase} disabled={!cases.length || loading} className="min-h-12 text-slate-200 hover:bg-white/10 hover:text-white"><RefreshCw className="mr-2 h-4 w-4" />Random case</Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Cases completed" value={String(completed.length)} />
        <Stat label="Average score" value={completed.length ? `${Math.round(completed.reduce((sum, item) => sum + (item.result?.score ?? 0), 0) / completed.length)}%` : '—'} />
        <Stat label="Verified rating" value={verified.length ? String(Math.round(verified.reduce((sum, item) => sum + (item.result?.points ?? 0), 0) / verified.length)) : 'Unrated'} />
        <Stat label="Verified badges" value={String(badges.length)} />
      </section>

      {(daily || weekly) && <section className="grid gap-3 sm:grid-cols-2">
        {daily && <RotationCard label="TODAY'S CHALLENGE" item={daily} onStart={onStart} />}
        {weekly && <RotationCard label="WEEKLY ROTATION" item={weekly} onStart={onStart} />}
      </section>}

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-xl font-semibold">Challenge library</h2><p className="mt-1 text-sm text-muted-foreground">Only source-backed trauma, emergency, and medication-safety scenarios appear here.</p></div>
          <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
        </div>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="Filter challenge category">
          <FilterChip selected={category === 'all'} onClick={() => setCategory('all')}>All cases</FilterChip>
          {categoryOrder.map(key => <FilterChip key={key} selected={category === key} onClick={() => setCategory(key)}>{categoryInfo[key].title}</FilterChip>)}
        </div>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Filter challenge difficulty">
          {['all', 'easy', 'medium', 'hard', 'expert'].map(value => <FilterChip key={value} selected={difficulty === value} onClick={() => setDifficulty(value)}>
            {value === 'all' ? 'Any level' : value === 'expert' ? 'Expert · review needed' : difficultyLabel[value]}
          </FilterChip>)}
        </div>
        {loading ? <p role="status" className="py-10 text-center text-sm text-muted-foreground">Loading supported challenge cases…</p> :
          filtered.length ? <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map(item => {
              const patient = item.characters.find(character => character.primary) ?? item.characters[0];
              const info = item.category ? categoryInfo[item.category] : null;
              return <article key={item.key} className="overflow-hidden rounded-2xl border border-border bg-background/70">
                <div className="relative flex h-36 items-center gap-4 bg-gradient-to-br from-slate-800 to-slate-950 px-4">
                  {patient && <PatientPortrait avatar={patient.avatar} age={patient.age} name={patient.name} className="h-24 w-24 rounded-2xl border border-white/15" />}
                  <div className="min-w-0">
                    <Badge variant="outline" className="border-teal-300/30 text-teal-200">{info?.short ?? item.specialty}</Badge>
                    <p className="mt-2 text-lg font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-300">{difficultyLabel[item.difficulty] ?? item.difficulty} · {item.emergency ? 'Timed scenario' : 'Procedure practice'}</p>
                  </div>
                  {item.emergency && <Clock3 className="absolute right-4 top-4 h-4 w-4 text-amber-300" />}
                </div>
                <div className="p-4">
                  <p className="text-xs text-muted-foreground">{patient ? `${patient.name}, ${patient.age}` : 'Synthetic patient'} · educational simulation</p>
                  <Button onClick={() => onStart(item.key)} className="mt-4 min-h-11 w-full justify-between">
                    Enter case <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </div>
              </article>;
            })}
          </div> : <div className="mt-6 rounded-xl border border-dashed border-border px-4 py-8 text-center">
            <p className="font-medium">No cases at this level yet</p>
            <p className="mt-1 text-sm text-muted-foreground">{difficulty === 'expert' ? 'Expert scenarios need clinically reviewed case rules before they can be enabled.' : 'Try another category or difficulty.'}</p>
          </div>}
        <p className="mt-5 flex gap-2 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" />Practice scores from unreviewed cases are educational only. Verified ratings and badges require clinically reviewed scenarios.</p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <h2 className="text-lg font-semibold">Category mastery</h2>
          <div className="mt-4 space-y-4">
            {mastery.map(item => <div key={item.key}>
              <div className="mb-2 flex justify-between gap-4 text-sm"><span>{categoryInfo[item.key].title}</span><span className="text-muted-foreground">{item.score === null ? 'Not rated' : `${item.score}%`} · {item.count} case{item.count === 1 ? '' : 's'}</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-teal-500" style={{ width: `${item.score ?? 0}%` }} /></div>
            </div>)}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <h2 className="text-lg font-semibold">Recent challenge history</h2>
          {challengeAttempts.length ? <div className="mt-3 divide-y divide-border">
            {challengeAttempts.slice(0, 4).map(item => <button key={item.id} type="button" onClick={() => item.status === 'in_progress' && onResume(item.id)} disabled={item.status !== 'in_progress'} className="flex w-full items-center justify-between gap-3 py-3 text-left disabled:cursor-default">
              <span className="min-w-0"><span className="block truncate text-sm font-medium">{item.title}</span><span className="text-xs text-muted-foreground">{new Date(item.started_at).toLocaleDateString()} · {item.status.replace('_', ' ')}</span></span>
              <span className="shrink-0 text-sm font-semibold text-teal-600 dark:text-teal-300">{item.result ? `${item.result.score}%` : item.status === 'in_progress' ? 'Resume' : '—'}</span>
            </button>)}
          </div> : <p className="mt-3 text-sm text-muted-foreground">Your completed and in-progress challenges will show here.</p>}
          {!!badges.length && <div className="mt-3 border-t border-border pt-4"><p className="mb-2 flex items-center gap-2 text-sm font-medium"><Award className="h-4 w-4 text-amber-500" />Unlocked badges</p><div className="flex flex-wrap gap-2">{badges.slice(0, 4).map(badge => <Badge key={`${badge.clinical_badge_definitions.name}-${badge.awarded_at}`} variant="secondary">{badge.clinical_badge_definitions.name}</Badge>)}</div></div>}
        </div>
      </section>
      <p className="text-center text-xs text-muted-foreground">Synthetic cases for pharmacy education only. In a real emergency, follow local protocols and contact emergency services.</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-border bg-card p-4"><p className="text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>;
}

function FilterChip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={selected} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-medium transition-colors ${selected ? 'border-teal-400 bg-teal-400/15 text-teal-700 dark:text-teal-200' : 'border-border text-muted-foreground hover:bg-muted'}`}>
    {children}
  </button>;
}

function RotationCard({ label, item, onStart }: { label: string; item: LibraryCase; onStart: (key: string) => void }) {
  const info = item.category ? categoryInfo[item.category] : null;
  return <article className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
    <div className="min-w-0"><p className="text-[10px] font-bold tracking-[0.16em] text-teal-600 dark:text-teal-300">{label}</p><p className="mt-1 truncate font-semibold">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{info?.title ?? item.specialty}</p></div>
    <Button variant="outline" size="sm" onClick={() => onStart(item.key)} className="shrink-0">Play</Button>
  </article>;
}

const regions: { id: BodyRegion; label: string; x: number; y: number; r: number }[] = [
  { id: 'head', label: 'Head', x: 130, y: 43, r: 25 },
  { id: 'throat', label: 'Throat', x: 130, y: 81, r: 15 },
  { id: 'chest', label: 'Chest', x: 130, y: 122, r: 31 },
  { id: 'abdomen', label: 'Abdomen', x: 130, y: 183, r: 28 },
  { id: 'arm', label: 'Upper arm', x: 75, y: 143, r: 16 },
  { id: 'forearm', label: 'Forearm', x: 61, y: 194, r: 15 },
  { id: 'hand', label: 'Hand', x: 50, y: 231, r: 14 },
  { id: 'leg', label: 'Leg', x: 111, y: 284, r: 17 },
];

function PatientScene({ session, selectedRegion, onRegion }: { session: SessionData; selectedRegion: BodyRegion | null; onRegion: (region: BodyRegion) => void }) {
  const scene = session.encounter.scene;
  const primary = session.encounter.characters.find(character => character.primary) ?? session.encounter.characters[0];
  return <div className="overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(160deg,#18282b,#10191b)] text-white">
    <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
      {primary && <PatientPortrait avatar={primary.avatar} age={primary.age} name={primary.name} className="h-12 w-12 rounded-xl" />}
      <div className="min-w-0 flex-1"><p className="truncate font-semibold">{primary?.name ?? 'Synthetic patient'}</p><p className="text-xs text-slate-300">{primary?.age ? `${primary.age} years` : 'Patient'} · {primary?.role ?? 'Patient'}</p></div>
      <Badge variant="outline" className="border-teal-300/30 text-teal-200">{scene ? categoryInfo[scene.category].short : 'Case'}</Badge>
    </div>
    <div className="grid items-center gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:p-5">
      <div className="rounded-xl bg-white/[0.03] p-2">
        <svg viewBox="0 0 260 340" role="img" aria-label="Interactive patient body map" className="mx-auto h-64 max-w-full sm:h-72">
          <g fill="#a9c1c0" stroke="#d4e5e1" strokeWidth="2">
            <circle cx="130" cy="43" r="23" />
            <path d="M117 68h26v18h-26zM98 88q32-12 64 0l12 79q-3 13-13 15l-4 37H103l-4-37q-10-2-13-15z" />
            <path d="M89 94 70 106l-13 71 15 4 23-63M171 94l19 12 13 71-15 4-23-63" />
            <path d="M105 212h22l-4 82-5 39h-18l3-45zM133 212h22l2 76 8 45h-18l-12-39z" />
          </g>
          <g fill="none" stroke="#425b5d" strokeWidth="1.5">
            <path d="M130 88v124M97 143h66M101 184h58" />
          </g>
          {regions.map(region => {
            const injured = scene?.bodyRegion === region.id && scene.injury && scene.injury !== 'none';
            const selected = selectedRegion === region.id;
            return <g key={region.id} role="button" tabIndex={0} aria-label={`Examine ${region.label}`} onClick={() => onRegion(region.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onRegion(region.id); } }} className="cursor-pointer">
              <circle cx={region.x} cy={region.y} r={region.r} fill={selected ? '#2dd4bf55' : injured ? '#fb718555' : '#ffffff01'} stroke={selected ? '#5eead4' : injured ? '#fb7185' : '#ffffff19'} strokeWidth={selected || injured ? 3 : 1} />
              {injured && <circle cx={region.x} cy={region.y} r="6" fill="#fb7185" className="animate-pulse" />}
              <title>{`${region.label}${injured ? ' — visible injury or finding' : ''}`}</title>
            </g>;
          })}
        </svg>
        <p className="text-center text-[11px] text-slate-300">Tap a body region to inspect it or apply the selected item.</p>
      </div>
      <div className="space-y-3">
        <div className="rounded-xl border border-white/10 bg-black/15 p-3">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-teal-200"><Activity className="h-4 w-4" />Presenting concern</p>
          <p className="mt-2 text-sm leading-5 text-slate-100">{session.encounter.complaint}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{session.encounter.symptoms.slice(0, 4).map(symptom => <Badge key={symptom} variant="outline" className="border-white/15 text-[10px] text-slate-200">{symptom}</Badge>)}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/15 p-3">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-300"><UserRound className="h-4 w-4" />Case notes</p>
          <p className="mt-2 text-xs leading-5 text-slate-300">{session.encounter.narrative}</p>
        </div>
        {session.encounter.characters.filter(character => !character.primary).map(character => <div key={character.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/15 p-3">
          <PatientPortrait avatar={character.avatar} age={character.age} name={character.name} className="h-10 w-10 rounded-lg" />
          <div><p className="text-sm font-medium">{character.name}</p><p className="text-xs text-slate-300">{character.role} · accompanying adult</p></div>
        </div>)}
      </div>
    </div>
  </div>;
}

const supplyCatalog = [
  { id: 'clean-cloth', label: 'Clean cloth / gauze', procedureId: 'pressure', note: 'Bleeding control', danger: false },
  { id: 'clean-water', label: 'Clean water', procedureId: 'rinse', note: 'Wound irrigation', danger: false },
  { id: 'sterile-dressing', label: 'Clean dressing', procedureId: 'dress', note: 'Cover the injury', danger: false },
  { id: 'alcohol', label: 'Alcohol', procedureId: 'alcohol-wound', note: 'Not appropriate for an open wound', danger: true },
  { id: 'remove-object', label: 'Remove an embedded object', procedureId: 'remove-embedded', note: 'Do not explore or remove embedded objects', danger: true },
];

export function InteractiveChallenge({
  session,
  remaining,
  busy,
  disabled,
  saved,
  onEvent,
  onChange,
  onSave,
  onSubmit,
}: {
  session: SessionData;
  remaining: number | null;
  busy: boolean;
  disabled: boolean;
  saved: boolean;
  onEvent: (kind: 'finding' | 'action' | 'procedure', id: string, targetRegion?: BodyRegion, supplyId?: string) => Promise<boolean>;
  onChange: (decisions: Decisions) => void;
  onSave: () => void;
  onSubmit: () => void;
}) {
  const [selectedSupply, setSelectedSupply] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<BodyRegion | null>(null);
  const procedures = session.encounter.procedures;
  const availableSupplies = useMemo(() => supplyCatalog.filter(item => procedures.some(procedure => procedure.id === item.procedureId)), [procedures]);
  const selectedItem = availableSupplies.find(item => item.id === selectedSupply);
  const completedFinding = (id: string) => session.attempt.events.some(event => event.kind === 'finding' && event.id === id);
  const procedureComplete = (id: string) => session.attempt.events.some(event => event.kind === 'procedure' && event.id === id && event.targetCorrect !== false && event.supplyCorrect !== false);
  const actionDone = (id: string) => session.attempt.events.some(event => event.kind === 'action' && event.id === id);

  const inspectRegion = (region: BodyRegion) => {
    setSelectedRegion(region);
    if (selectedItem) {
      void onEvent('procedure', selectedItem.procedureId, region, selectedItem.id).then(correct => {
        if (correct) setSelectedSupply(null);
      });
      return;
    }
    const next = session.encounter.findings.find(finding => !completedFinding(finding.id));
    if (next) void onEvent('finding', next.id, region);
  };

  const performStep = (id: string) => void onEvent('procedure', id);
  const diagnosis = session.attempt.decisions.diagnosis;
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-600 dark:text-teal-300">Interactive patient scene</p>
      <Badge variant="outline">{session.attempt.mode}</Badge>
    </div>
    <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />Educational simulation only. This timer is a game setting, not a clinical deadline. Follow local emergency protocols in real care.</p>

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
      <div className="space-y-4">
        <PatientScene session={session} selectedRegion={selectedRegion} onRegion={inspectRegion} />
        {session.encounter.scene?.category === 'trauma' && availableSupplies.length > 0 && <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Select a supply</h2><p className="mt-1 text-xs text-muted-foreground">Choose an item, then tap the patient region where you would apply it.</p></div><Badge variant="outline">Tap to select · tap to apply</Badge></div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {availableSupplies.map(item => <button key={item.id} type="button" onClick={() => setSelectedSupply(current => current === item.id ? null : item.id)} disabled={disabled || busy} aria-pressed={selectedSupply === item.id} className={`min-h-[86px] rounded-xl border p-3 text-left transition-colors ${item.danger ? 'border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10' : 'border-border bg-background hover:border-teal-500/50'} ${selectedSupply === item.id ? 'ring-2 ring-teal-500' : ''}`}>
              <span className="block text-sm font-semibold">{item.label}</span><span className={`mt-1 block text-[11px] ${item.danger ? 'text-rose-500' : 'text-muted-foreground'}`}>{item.note}</span>
            </button>)}
          </div>
          {selectedItem && <p role="status" className="mt-3 text-xs text-teal-700 dark:text-teal-200">Selected: {selectedItem.label}. Now tap a region on the patient.</p>}
        </section>}
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 font-semibold"><BookOpen className="h-4 w-4 text-teal-600" />Assessment clues</h2>
          <div className="mt-3 space-y-2">
            {session.encounter.findings.map(finding => {
              const done = completedFinding(finding.id);
              return <div key={finding.id} className="rounded-xl border border-border bg-background p-3">
                <Button variant="ghost" className="h-auto min-h-10 w-full justify-between whitespace-normal p-0 text-left" disabled={disabled || busy || done} onClick={() => void onEvent('finding', finding.id)}>
                  <span className="text-sm">{finding.label}</span>{done ? <Check className="ml-2 h-4 w-4 shrink-0 text-teal-500" /> : <ArrowUpRight className="ml-2 h-4 w-4 shrink-0" />}
                </Button>
                {finding.answer && done && <p className="mt-2 border-l-2 border-teal-500 pl-3 text-sm leading-5 text-muted-foreground">{finding.answer}</p>}
              </div>;
            })}
          </div>
        </section>
      </div>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-semibold">Actions & procedure</h2>
          <p className="mt-1 text-xs text-muted-foreground">Your taps are recorded as encounter events and evaluated against the case rules.</p>
          {session.encounter.actions.length > 0 && <div className="mt-3 space-y-2">
            {session.encounter.actions.map(action => <Button key={action.id} variant={actionDone(action.id) ? 'secondary' : 'outline'} className="h-auto min-h-11 w-full justify-between whitespace-normal py-3 text-left" disabled={disabled || busy || actionDone(action.id)} onClick={() => void onEvent('action', action.id)}>
              <span>{action.label}</span>{actionDone(action.id) ? <Check className="ml-2 h-4 w-4 shrink-0 text-teal-500" /> : <ArrowUpRight className="ml-2 h-4 w-4 shrink-0" />}
            </Button>)}
          </div>}
          {procedures.length > 0 && <div className="mt-5 border-t border-border pt-4">
            <h3 className="text-sm font-medium">Procedure sequence</h3>
            <div className="mt-2 space-y-2">
              {procedures.map((procedure, index) => {
                const supplyStep = availableSupplies.some(item => item.procedureId === procedure.id);
                const done = procedureComplete(procedure.id);
                const failed = session.attempt.events.some(event => event.kind === 'procedure' && event.id === procedure.id && (event.targetCorrect === false || event.supplyCorrect === false));
                return <div key={procedure.id} className="flex items-start gap-3 rounded-xl border border-border p-3">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${done ? 'bg-teal-500 text-slate-950' : 'bg-muted text-muted-foreground'}`}>{done ? <Check className="h-3.5 w-3.5" /> : index + 1}</span>
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium">{procedure.label}</p><p className="mt-1 text-xs text-muted-foreground">{failed && !done ? 'Recorded attempt needs correction.' : done ? 'Recorded' : supplyStep ? 'Choose the matching supply above.' : 'Tap to record this step.'}</p></div>
                  {!supplyStep && <Button size="sm" variant="ghost" disabled={disabled || busy || done} onClick={() => performStep(procedure.id)} aria-label={`Record ${procedure.label}`}>{done ? <Check className="h-4 w-4 text-teal-500" /> : <ArrowUpRight className="h-4 w-4" />}</Button>}
                </div>;
              })}
            </div>
          </div>}
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-semibold">Clinical impression</h2>
          <label htmlFor="challenge-diagnosis" className="mt-3 block text-xs text-muted-foreground">Your working impression</label>
          <Input id="challenge-diagnosis" value={diagnosis} onChange={event => onChange({ ...session.attempt.decisions, diagnosis: event.target.value })} disabled={disabled || busy} placeholder="Enter your impression…" className="mt-2 min-h-11" />
        </section>

        {session.encounter.scene?.category === 'medication_emergency' && <section className="rounded-2xl border border-border bg-card p-4"><h2 className="mb-3 font-semibold">Medication decisions</h2><MedicationOrders attemptId={session.attempt.id} decisions={session.attempt.decisions} onChange={onChange} disabled={disabled || busy} /></section>}

        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="flex items-center gap-2 text-sm font-medium"><AlertTriangle className="h-4 w-4 text-amber-500" />Clinical review status</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">These source-backed scenarios are not yet marked clinically reviewed. The score is provisional; this challenge cannot award verified points or professional credentials.</p>
          {!!session.encounter.sources.length && <div className="mt-3 border-t border-amber-500/20 pt-3"><p className="mb-2 text-xs font-medium">Case references</p><ul className="space-y-2">{session.encounter.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline underline-offset-2">{source.name}</a></li>)}</ul></div>}
        </section>
      </aside>
    </div>

    <div className="sticky bottom-20 z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur sm:bottom-4">
      <span className="flex-1 text-xs text-muted-foreground">{saved ? 'Progress saved' : 'Unsaved clinical impression'}</span>
      <Button variant="outline" disabled={busy || disabled || saved} onClick={onSave} className="min-h-11">Save</Button>
      <Button disabled={busy} onClick={onSubmit} className="min-h-11">{busy ? 'Saving…' : remaining === 0 ? 'Finish challenge' : 'Complete challenge'}</Button>
    </div>
  </div>;
}
