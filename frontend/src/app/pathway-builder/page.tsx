'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, type AlpcCompileResult, type AlpcPathway } from '@/lib/api';
import { PipelineVisualization } from '@/components/alpc/PipelineVisualization';
import { OutcomeCard } from '@/components/alpc/OutcomeCard';
import { highlightPathLang } from '@/lib/pathlang';

interface OutcomeEntry { name: string; adjustment: number }
interface RuleEntry { variable: string; operator: string; value: number; outcome: string }

const OPERATORS = ['<', '>', '==', '!=', '<=', '>='];
const VARIABLES = ['performance', 'mastery', 'attempts', 'completion_rate'];

function generatePathLang(outcomes: OutcomeEntry[], variables: Record<string, number>, rules: RuleEntry[]): string {
  const lines: string[] = [];
  // Backward Design: every OUTCOME is emitted before any rule that targets it.
  for (const o of outcomes) {
    const name = o.name.trim();
    if (!name) continue;
    if (o.adjustment > 0) lines.push(`OUTCOME ${name} += ${o.adjustment};`);
    else if (o.adjustment < 0) lines.push(`OUTCOME ${name} -= ${Math.abs(o.adjustment)};`);
    else lines.push(`OUTCOME ${name};`);
  }
  lines.push('');
  for (const [k, v] of Object.entries(variables)) lines.push(`SET ${k} = ${Math.round(v)};`);
  lines.push('SET state = 0;', '');
  for (const r of rules) {
    if (r.variable && r.outcome.trim()) lines.push(`IF ${r.variable} ${r.operator} ${r.value} GOTO ${r.outcome.trim()};`);
  }
  return lines.join('\n');
}

function Slider({ id, label, value, min, max, onChange }: { id: string; label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label htmlFor={id} className="label flex justify-between">
        <span>{label}</span><span className="t-num font-normal">{value}</span>
      </label>
      <input id={id} type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} />
    </div>
  );
}

export default function PathwayBuilder() {
  const [name, setName] = useState('Trees mastery');
  const [topic, setTopic] = useState('Trees');
  const [description, setDescription] = useState('Sends students to one of four levels based on their Trees quiz.');
  const [outcomes, setOutcomes] = useState<OutcomeEntry[]>([
    { name: 'remedial', adjustment: 0 },
    { name: 'practice', adjustment: 0 },
    { name: 'core', adjustment: 0 },
    { name: 'advanced', adjustment: 0 },
  ]);
  const [rules, setRules] = useState<RuleEntry[]>([
    { variable: 'performance', operator: '<', value: 50, outcome: 'remedial' },
    { variable: 'performance', operator: '<', value: 70, outcome: 'practice' },
    { variable: 'performance', operator: '<', value: 85, outcome: 'core' },
    { variable: 'performance', operator: '>=', value: 85, outcome: 'advanced' },
  ]);

  const [perf, setPerf] = useState(62);
  const [mastery, setMastery] = useState(58);
  const [attempts, setAttempts] = useState(2);
  const [simResult, setSimResult] = useState<AlpcCompileResult | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<AlpcPathway[] | null>(null);

  const source = generatePathLang(outcomes, { performance: perf, mastery, attempts }, rules);

  useEffect(() => {
    api.getPathways().then(r => setSaved(r.pathways || [])).catch(() => setSaved([]));
  }, []);

  const updateOutcome = (i: number, patch: Partial<OutcomeEntry>) =>
    setOutcomes(prev => prev.map((o, k) => (k === i ? { ...o, ...patch } : o)));
  const updateRule = (i: number, patch: Partial<RuleEntry>) =>
    setRules(prev => prev.map((r, k) => (k === i ? { ...r, ...patch } : r)));

  const simulate = useCallback(async () => {
    setSimulating(true);
    setSimError(null);
    try {
      setSimResult(await api.compilePathLang(source));
    } catch (err) {
      setSimResult(null);
      setSimError(err instanceof Error ? err.message : 'The program could not be compiled.');
    } finally {
      setSimulating(false);
    }
  }, [source]);

  const save = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await api.createPathway({ name, topic, description, outcomes, rules });
      setSavedAt(new Date().toLocaleTimeString());
      const r = await api.getPathways();
      setSaved(r.pathways || []);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'The pathway was not saved.');
    } finally {
      setSaving(false);
    }
  }, [name, topic, description, outcomes, rules]);

  const outcomeNames = outcomes.map(o => o.name.trim()).filter(Boolean);

  return (
    <div className="mx-auto max-w-[76rem] px-4 py-8 sm:px-6">
      <header className="pb-6">
        <h1 className="text-[1.75rem]">Pathway builder</h1>
        <p className="mt-1 prose-measure text-[0.9375rem] t-graphite">
          Define outcomes and rules with the form. The builder writes the Path-Lang program for you, and you can test
          it against a sample student before saving.
        </p>
      </header>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-10">
          <section aria-labelledby="details-h" className="space-y-4">
            <h2 id="details-h" className="text-lg">Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="pw-name" className="label">Name</label>
                <input id="pw-name" className="field" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label htmlFor="pw-topic" className="label">Topic</label>
                <input id="pw-topic" className="field" value={topic} onChange={e => setTopic(e.target.value)} />
              </div>
            </div>
            <div>
              <label htmlFor="pw-desc" className="label">Description</label>
              <input id="pw-desc" className="field" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
          </section>

          <section aria-labelledby="outcomes-h" className="space-y-3">
            <div>
              <h2 id="outcomes-h" className="text-lg">Outcomes</h2>
              <p className="mt-1 text-sm t-graphite">
                Outcomes are written first because a rule can only jump to an outcome declared above it. The score
                adjustment is added to the alignment score when a student lands there.
              </p>
            </div>
            <table className="table">
              <thead><tr><th>Name</th><th className="w-36">Score adjustment</th><th className="w-20"><span className="sr-only">Remove</span></th></tr></thead>
              <tbody>
                {outcomes.map((o, i) => (
                  <tr key={i}>
                    <td>
                      <input aria-label={`Outcome ${i + 1} name`} className="field field-mono" placeholder="outcome_name"
                        value={o.name} onChange={e => updateOutcome(i, { name: e.target.value })} />
                    </td>
                    <td>
                      <input aria-label={`Outcome ${i + 1} score adjustment`} type="number" className="field field-mono"
                        value={o.adjustment} onChange={e => updateOutcome(i, { adjustment: parseInt(e.target.value, 10) || 0 })} />
                    </td>
                    <td>
                      <button type="button" className="btn btn-quiet btn-sm" onClick={() => setOutcomes(prev => prev.filter((_, k) => k !== i))}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setOutcomes(p => [...p, { name: '', adjustment: 0 }])}>
              Add outcome
            </button>
          </section>

          <section aria-labelledby="rules-h" className="space-y-3">
            <div>
              <h2 id="rules-h" className="text-lg">Rules</h2>
              <p className="mt-1 text-sm t-graphite">Checked from top to bottom. The first rule that holds decides the outcome.</p>
            </div>
            <ol className="space-y-2">
              {rules.map((r, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2 text-sm sm:flex-nowrap">
                  <span className="w-5 text-right t-faint t-num">{i + 1}</span>
                  <span className="font-[family-name:var(--font-mono)] font-semibold">IF</span>
                  <select aria-label={`Rule ${i + 1} variable`} className="field field-mono w-auto min-w-0" value={r.variable}
                    onChange={e => updateRule(i, { variable: e.target.value })}>
                    {VARIABLES.map(v => <option key={v}>{v}</option>)}
                  </select>
                  <select aria-label={`Rule ${i + 1} operator`} className="field field-mono w-auto" value={r.operator}
                    onChange={e => updateRule(i, { operator: e.target.value })}>
                    {OPERATORS.map(op => <option key={op}>{op}</option>)}
                  </select>
                  <input aria-label={`Rule ${i + 1} value`} type="number" className="field field-mono w-20" value={r.value}
                    onChange={e => updateRule(i, { value: parseInt(e.target.value, 10) || 0 })} />
                  <span className="font-[family-name:var(--font-mono)] font-semibold">GOTO</span>
                  <select aria-label={`Rule ${i + 1} outcome`} className="field field-mono min-w-[7rem] flex-1" value={r.outcome}
                    onChange={e => updateRule(i, { outcome: e.target.value })}>
                    <option value="">choose outcome</option>
                    {outcomeNames.map(n => <option key={n}>{n}</option>)}
                  </select>
                  <button type="button" className="btn btn-quiet btn-sm" onClick={() => setRules(prev => prev.filter((_, k) => k !== i))}>
                    Remove
                  </button>
                </li>
              ))}
            </ol>
            <button type="button" className="btn btn-outline btn-sm"
              onClick={() => setRules(p => [...p, { variable: 'performance', operator: '<', value: 50, outcome: outcomeNames[0] || '' }])}>
              Add rule
            </button>
          </section>

          <section aria-labelledby="program-h" className="space-y-3">
            <h2 id="program-h" className="text-lg">Generated program</h2>
            <div className="listing"><pre>{source.split('\n').map((l, i) => <div key={i}>{l ? highlightPathLang(l) : ' '}</div>)}</pre></div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={save} disabled={saving} className="btn btn-primary">
                {saving ? 'Saving…' : 'Save pathway'}
              </button>
              {savedAt && !saveError && <p className="text-sm t-pass" role="status">Saved at {savedAt}.</p>}
              {saveError && <p className="text-sm t-mark" role="alert">{saveError}</p>}
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-8">
          <section aria-labelledby="sim-h" className="panel space-y-5 p-5">
            <div>
              <h2 id="sim-h" className="text-lg">Test with a sample student</h2>
              <p className="mt-1 text-sm t-graphite">These values become the SET lines of the program above.</p>
            </div>
            <Slider id="sim-perf" label="Performance" value={perf} min={0} max={100} onChange={setPerf} />
            <Slider id="sim-mastery" label="Mastery" value={mastery} min={0} max={100} onChange={setMastery} />
            <Slider id="sim-attempts" label="Attempts" value={attempts} min={1} max={10} onChange={setAttempts} />
            <button type="button" onClick={simulate} disabled={simulating} className="btn btn-primary w-full">
              {simulating ? 'Compiling…' : 'Compile and run'}
            </button>
          </section>

          {simulating && !simResult && (
            <div className="space-y-2" aria-label="Compiling"><div className="skel h-7 w-40" /><div className="skel h-4 w-56" /></div>
          )}
          {simError && <p className="notice notice-error" role="alert">{simError}</p>}
          {simResult && (
            <section aria-label="Result" className="space-y-5">
              <OutcomeCard result={simResult} />
              <PipelineVisualization stages={simResult.stages} />
            </section>
          )}

          <section aria-labelledby="saved-h" className="space-y-3">
            <h2 id="saved-h" className="text-lg">Saved pathways</h2>
            {saved === null ? (
              <div className="space-y-2"><div className="skel h-4 w-full" /><div className="skel h-4 w-4/5" /></div>
            ) : saved.length === 0 ? (
              <p className="text-sm t-graphite">None saved yet.</p>
            ) : (
              <table className="table">
                <thead><tr><th>Name</th><th>Topic</th><th className="text-right">Rules</th></tr></thead>
                <tbody>
                  {saved.slice(0, 8).map(p => (
                    <tr key={p._id}>
                      <td className="font-medium">{p.name}</td>
                      <td className="t-graphite">{p.topic}</td>
                      <td className="text-right t-num">{p.rules?.length || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
