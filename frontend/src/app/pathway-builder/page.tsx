'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Play, Save, ChevronDown, ChevronUp, Code2, Wrench, Sparkles, CheckCircle2 } from 'lucide-react';
import { api, type AlpcCompileResult, type AlpcPathway } from '@/lib/api';
import { PipelineVisualization } from '@/components/alpc/PipelineVisualization';
import { OutcomeCard } from '@/components/alpc/OutcomeCard';
import { PathLangEditor } from '@/components/alpc/PathLangEditor';

interface OutcomeEntry {
  name: string;
  adjustment: number;
}

interface RuleEntry {
  variable: string;
  operator: string;
  value: number;
  outcome: string;
}

const OPERATORS = ['<', '>', '==', '>=', '<=', '!='];
const VARIABLES = ['performance', 'mastery', 'attempts', 'completion_rate'];

function generatePathLangPreview(
  outcomes: OutcomeEntry[],
  variables: Record<string, number>,
  rules: RuleEntry[]
): string {
  const lines: string[] = [];

  // Backward Design: OUTCOME statements must come first!
  for (const o of outcomes) {
    if (!o.name.trim()) continue;
    if (o.adjustment > 0) lines.push(`OUTCOME ${o.name.trim()} += ${o.adjustment};`);
    else if (o.adjustment < 0) lines.push(`OUTCOME ${o.name.trim()} -= ${Math.abs(o.adjustment)};`);
    else lines.push(`OUTCOME ${o.name.trim()};`);
  }

  lines.push('');

  for (const [k, v] of Object.entries(variables)) {
    if (k !== 'state') lines.push(`SET ${k} = ${Math.round(v)};`);
  }
  lines.push('SET state = 0;');

  lines.push('');

  for (const r of rules) {
    if (r.variable && r.outcome.trim()) {
      lines.push(`IF ${r.variable} ${r.operator} ${r.value} GOTO ${r.outcome.trim()};`);
    }
  }

  return lines.join('\n');
}

export default function PathwayBuilder() {
  const [name, setName] = useState('Data Structures Mastery');
  const [topic, setTopic] = useState('Trees');
  const [description, setDescription] = useState('Adaptive compiler pathway for tree data structures');
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

  // Demo Student Simulation state (PRD Section 22 & Section 32 Demo Scenario)
  const [simPerformance, setSimPerformance] = useState(62);
  const [simMastery, setSimMastery] = useState(58);
  const [simAttempts, setSimAttempts] = useState(2);
  const [simResult, setSimResult] = useState<AlpcCompileResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);

  // Persistence
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedPathways, setSavedPathways] = useState<AlpcPathway[]>([]);
  const [showPreview, setShowPreview] = useState(true);

  const previewSource = generatePathLangPreview(
    outcomes,
    { performance: simPerformance, mastery: simMastery, attempts: simAttempts },
    rules
  );

  useEffect(() => {
    api.getPathways()
      .then(r => setSavedPathways(r.pathways || []))
      .catch(() => {});
  }, []);

  const addOutcome = () => setOutcomes(prev => [...prev, { name: '', adjustment: 0 }]);
  const removeOutcome = (i: number) => setOutcomes(prev => prev.filter((_, idx) => idx !== i));
  const updateOutcome = (i: number, patch: Partial<OutcomeEntry>) =>
    setOutcomes(prev => prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));

  const addRule = () =>
    setRules(prev => [
      ...prev,
      { variable: 'performance', operator: '<', value: 50, outcome: outcomes[0]?.name || '' },
    ]);
  const removeRule = (i: number) => setRules(prev => prev.filter((_, idx) => idx !== i));
  const updateRule = (i: number, patch: Partial<RuleEntry>) =>
    setRules(prev => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const simulate = useCallback(async () => {
    setIsSimulating(true);
    setSimError(null);
    setSimResult(null);
    try {
      const res = await api.compilePathLang(previewSource);
      setSimResult(res);
    } catch (err) {
      setSimError(err instanceof Error ? err.message : 'Simulation compile failed');
    } finally {
      setIsSimulating(false);
    }
  }, [previewSource]);

  const save = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await api.createPathway({ name, topic, description, outcomes, rules });
      setSaved(true);
      const r = await api.getPathways();
      setSavedPathways(r.pathways || []);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save pathway');
    } finally {
      setSaving(false);
    }
  }, [name, topic, description, outcomes, rules]);

  return (
    <div className="max-w-7xl mx-auto px-5 py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/15 border border-indigo-500/20">
            <Wrench className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Adaptive Pathway Builder</h1>
            <p className="text-sm text-[var(--text-muted)]">
              Visual Rules &rarr; Path-Lang Code Generation &rarr; ALPC Compilation Pipeline
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Left: Builder (3/5) */}
        <div className="xl:col-span-3 space-y-5">
          {/* Metadata */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Pathway Metadata</h2>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1 block">Pathway Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-indigo-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1 block">Target Course / Topic</label>
                <input
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Description</label>
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional description"
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>

          {/* Outcomes */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">1. Learning Outcomes</h2>
                <p className="text-[11px] text-[var(--text-muted)]">Backward Design: Declared before conditional branches</p>
              </div>
              <button
                onClick={addOutcome}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Add Outcome
              </button>
            </div>
            <div className="space-y-2">
              {outcomes.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-violet-500/15 text-[10px] font-bold text-violet-400">
                    {i + 1}
                  </div>
                  <input
                    value={o.name}
                    onChange={e => updateOutcome(i, { name: e.target.value })}
                    placeholder="outcome_name"
                    className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none focus:border-violet-500/50 font-mono"
                  />
                  <input
                    type="number"
                    value={o.adjustment}
                    onChange={e => updateOutcome(i, { adjustment: parseInt(e.target.value, 10) || 0 })}
                    placeholder="±adj"
                    title="Score delta adjustment on outcome selection"
                    className="w-24 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-violet-500/50 text-center font-mono"
                  />
                  <button
                    onClick={() => removeOutcome(i)}
                    className="text-white/30 hover:text-rose-400 transition-colors p-1 cursor-pointer"
                    aria-label={`Remove outcome ${o.name || i + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Rules */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">2. Adaptive Decision Rules</h2>
                <p className="text-[11px] text-[var(--text-muted)]">Evaluated in order &rarr; IF condition GOTO outcome</p>
              </div>
              <button
                onClick={addRule}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Add Rule
              </button>
            </div>
            <div className="space-y-2">
              {rules.map((r, i) => (
                <div key={i} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <span className="text-xs text-indigo-400 font-mono font-bold w-6 flex-shrink-0">IF</span>
                  <select
                    value={r.variable}
                    onChange={e => updateRule(i, { variable: e.target.value })}
                    className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-indigo-500/50"
                  >
                    {VARIABLES.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                  <select
                    value={r.operator}
                    onChange={e => updateRule(i, { operator: e.target.value })}
                    className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-indigo-500/50 font-mono font-bold"
                  >
                    {OPERATORS.map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={r.value}
                    onChange={e => updateRule(i, { value: parseInt(e.target.value, 10) || 0 })}
                    className="w-20 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-indigo-500/50 text-center font-mono"
                  />
                  <span className="text-xs text-amber-400 font-mono font-bold flex-shrink-0">&rarr; GOTO</span>
                  <select
                    value={r.outcome}
                    onChange={e => updateRule(i, { outcome: e.target.value })}
                    className="flex-1 min-w-[120px] bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-indigo-500/50 font-mono"
                  >
                    <option value="">Select outcome...</option>
                    {outcomes.map(o => (
                      <option key={o.name} value={o.name}>{o.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeRule(i)}
                    className="text-white/30 hover:text-rose-400 transition-colors p-1 cursor-pointer"
                    aria-label={`Remove rule ${i + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Generated Path-Lang Source */}
          <div className="card p-5">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center justify-between w-full mb-2 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-indigo-400" />
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Generated Path-Lang Program</h2>
              </div>
              <span className="text-white/40">{showPreview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
            </button>
            {showPreview && (
              <div className="mt-3">
                <PathLangEditor value={previewSource} onChange={() => {}} readOnly minRows={8} />
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-600/20"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : saved ? 'Pathway Saved!' : 'Save Pathway'}
            </button>
          </div>
          {saveError && <p className="text-xs text-rose-400">{saveError}</p>}
        </div>

        {/* Right: Student Simulation (2/5) */}
        <div className="xl:col-span-2 space-y-5">
          {/* Student Simulation controls (PRD Section 22) */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Student Simulation Mode</h2>
            </div>
            <p className="text-xs text-[var(--text-muted)] mb-4 leading-relaxed">
              Feed student metrics into the pathway generator, compile through ALPC, and observe the decision trace in real time.
            </p>

            <div className="space-y-4 mb-5">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--text-secondary)]">Student Performance</span>
                  <span className="font-bold text-indigo-300 font-mono">{simPerformance}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={simPerformance}
                  onChange={e => setSimPerformance(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--text-secondary)]">Topic Mastery</span>
                  <span className="font-bold text-indigo-300 font-mono">{simMastery}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={simMastery}
                  onChange={e => setSimMastery(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--text-secondary)]">Assessment Attempts</span>
                  <span className="font-bold text-indigo-300 font-mono">{simAttempts}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={simAttempts}
                  onChange={e => setSimAttempts(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>

            <button
              onClick={simulate}
              disabled={isSimulating}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-600/20"
            >
              <Play className="h-4 w-4" />
              {isSimulating ? 'Compiling Pathway...' : 'Run Adaptive Pathway'}
            </button>
          </div>

          {/* Simulation Output */}
          {simResult && (
            <div className="space-y-4">
              <div className="card p-4">
                <p className="text-xs text-white/40 uppercase tracking-wide font-medium mb-3">Compiler Execution Pipeline</p>
                <PipelineVisualization stages={simResult.stages} isCompiling={isSimulating} />
              </div>

              <OutcomeCard result={simResult} />
            </div>
          )}

          {simError && (
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3.5">
              <p className="text-xs text-rose-300 font-mono">{simError}</p>
            </div>
          )}

          {/* Saved Pathways in DB */}
          {savedPathways.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Configured Pathways ({savedPathways.length})</h2>
              </div>
              <div className="space-y-2">
                {savedPathways.slice(0, 5).map(p => (
                  <div
                    key={p._id}
                    className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-[var(--text-primary)]">{p.name}</p>
                      <span className="text-[10px] text-indigo-300 font-mono">{p.topic}</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {p.outcomes?.length || 0} outcomes &bull; {p.rules?.length || 0} decision rules
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
