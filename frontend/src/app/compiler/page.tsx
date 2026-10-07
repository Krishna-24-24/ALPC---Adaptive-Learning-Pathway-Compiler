'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, BackendUnavailableError, type AlpcCheckResult, type AlpcCompileResult } from '@/lib/api';
import { PathLangEditor } from '@/components/alpc/PathLangEditor';
import { PipelineVisualization } from '@/components/alpc/PipelineVisualization';
import { TokenTable } from '@/components/alpc/TokenTable';
import { AstTree } from '@/components/alpc/AstTree';
import { OutcomeCard } from '@/components/alpc/OutcomeCard';
import { backwardDesignStatus } from '@/components/alpc/types';
import { ControlFlowGraph } from '@/components/alpc/ControlFlowGraph';
import { OptimizedIr } from '@/components/alpc/OptimizedIr';

const EXAMPLES = [
  {
    id: 'three-tier',
    label: 'Three outcomes',
    source: `OUTCOME remedial;
OUTCOME core;
OUTCOME advanced;

SET performance = 72;
SET state = 0;

IF performance < 50 GOTO remedial;
IF performance < 80 GOTO core;
IF performance >= 80 GOTO advanced;`,
  },
  {
    id: 'four-tier',
    label: 'Four outcomes with mastery',
    source: `OUTCOME remedial;
OUTCOME practice;
OUTCOME core;
OUTCOME advanced;

SET performance = 62;
SET mastery = 58;
SET state = 0;

IF performance < 50 GOTO remedial;
IF performance < 70 GOTO practice;
IF performance < 85 GOTO core;
IF performance >= 85 GOTO advanced;`,
  },
  {
    id: 'and-or',
    label: 'Rules with AND and OR',
    source: `OUTCOME remedial;
OUTCOME practice;
OUTCOME core;
OUTCOME advanced;

SET performance = 74;
SET mastery = 35;
SET state = 74;

# AND binds tighter than OR; brackets group.
IF performance < 50 OR mastery < 25 GOTO remedial;
IF performance >= 85 AND mastery >= 70 GOTO advanced;
IF (performance < 70 OR mastery < 40) AND performance >= 50 GOTO practice;
IF performance >= 50 GOTO core;`,
  },
  {
    id: 'binary',
    label: 'Score adjustments and binary output',
    source: `OUTCOME remedial += 5;
OUTCOME core += 10;
OUTCOME advanced += 20;

SET performance = 60;
SET state = 0;
SET state += 15;

IF performance < 50 GOTO remedial;
IF performance < 80 GOTO core;
IF performance >= 80 GOTO advanced; b`,
  },
  {
    id: 'violation',
    label: 'Backward Design violation',
    source: `SET performance = 40;
SET state = 0;

IF performance < 50 GOTO remedial;

OUTCOME remedial;
OUTCOME core;`,
  },
];

type TabId = 'result' | 'pipeline' | 'tokens' | 'parse' | 'ast' | 'ir' | 'cfg' | 'opt';

export default function CompilerPlayground() {
  const [source, setSource] = useState(EXAMPLES[0].source);
  const [exampleId, setExampleId] = useState(EXAMPLES[0].id);
  const [result, setResult] = useState<AlpcCompileResult | null>(null);
  const [compiling, setCompiling] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>('result');
  const [copied, setCopied] = useState(false);
  // Compile-only check while typing, for red underlines in the editor.
  const [live, setLive] = useState<{ state: 'checking' | 'done' | 'offline'; result: AlpcCheckResult | null }>({ state: 'checking', result: null });

  useEffect(() => {
    const ctrl = new AbortController();
    setLive(l => ({ ...l, state: 'checking' }));
    const t = setTimeout(async () => {
      try {
        const r = await api.checkPathLang(source, ctrl.signal);
        setLive({ state: 'done', result: r });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (err instanceof BackendUnavailableError) { setLive({ state: 'offline', result: null }); return; }
        const message = err instanceof Error ? err.message : 'The check failed.';
        setLive({ state: 'done', result: { success: false, backwardDesign: null, diagnostics: [{ stage: 'check', kind: 'internal', message }] } });
      }
    }, 350);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [source]);

  const compile = useCallback(async () => {
    setCompiling(true);
    setRequestError(null);
    try {
      const res = await api.compilePathLang(source);
      setResult(res);
      setTab(res.success ? 'result' : 'pipeline');
    } catch (err) {
      setResult(null);
      setRequestError(
        err instanceof Error ? err.message : 'The request failed.',
      );
    } finally {
      setCompiling(false);
    }
  }, [source]);

  async function copyIr() {
    if (!result?.irSource) return;
    await navigator.clipboard.writeText(result.irSource);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Prefer the live check (it follows every keystroke); fall back to the last full run.
  const bd = backwardDesignStatus(live.result ? { diagnostics: live.result.diagnostics, stages: [], backwardDesign: live.result.backwardDesign } : result);
  const liveDiags = (live.result?.diagnostics || []).filter(d => d.kind !== 'internal');
  const internal = live.result?.diagnostics.find(d => d.kind === 'internal');
  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'result', label: 'Result' },
    { id: 'pipeline', label: 'Pipeline' },
    { id: 'tokens', label: 'Tokens', count: result?.tokens?.length || undefined },
    { id: 'parse', label: 'Parse trace', count: result?.traceLines?.length || undefined },
    { id: 'ast', label: 'AST' },
    { id: 'ir', label: 'LLVM IR' },
    { id: 'cfg', label: 'Control flow' },
    { id: 'opt', label: 'Optimized' },
  ];

  return (
    <div className="mx-auto max-w-[76rem] px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4 pb-6">
        <div>
          <h1 className="text-[1.75rem]">Playground</h1>
          <p className="mt-1 text-[0.9375rem] t-graphite">
            Write a Path-Lang program, then compile and run it with the real ALPC compiler.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="example" className="sr-only">Example program</label>
          <select
            id="example"
            className="field w-auto text-sm"
            value={exampleId}
            onChange={e => {
              const ex = EXAMPLES.find(x => x.id === e.target.value);
              if (ex) { setExampleId(ex.id); setSource(ex.source); setResult(null); }
            }}
          >
            {EXAMPLES.map(ex => <option key={ex.id} value={ex.id}>{ex.label}</option>)}
          </select>
          <button type="button" onClick={compile} disabled={compiling} className="btn btn-primary">
            {compiling ? 'Compiling…' : 'Compile and run'}
          </button>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="min-w-0 space-y-3">
          <PathLangEditor value={source} onChange={setSource} minRows={16} diagnostics={liveDiags} />
          <p className="text-sm" aria-live="polite">
            {live.state === 'checking' && <span className="t-graphite">Checking…</span>}
            {live.state === 'offline' && <span className="t-graphite">Live checking is off because the backend is not reachable.</span>}
            {live.state === 'done' && internal && <span className="t-mark">{internal.message}</span>}
            {live.state === 'done' && !internal && liveDiags.length === 0 && <span className="t-pass">Checked as you type: no problems.</span>}
            {live.state === 'done' && !internal && liveDiags.length > 0 && (
              <span className="t-mark">{liveDiags.length === 1 ? '1 problem' : `${liveDiags.length} problems`} found while you typed. Fix {liveDiags.length === 1 ? 'it' : 'them'} before compiling.</span>
            )}
          </p>
          {requestError && <p className="notice notice-error" role="alert">{requestError}</p>}
          <p className="text-sm">
            <span className="font-medium">Backward Design check: </span>
            {bd === 'pass' && <span className="t-pass">passed. Every GOTO target is declared above the rule that uses it.</span>}
            {bd === 'fail' && <span className="t-mark">failed. A rule jumps to an outcome that is not declared above it.</span>}
            {bd === 'unknown' && <span className="t-graphite">runs when you compile. Every OUTCOME must be declared before a rule jumps to it.</span>}
          </p>
        </div>

        <div className="min-w-0">
          <div role="tablist" aria-label="Compiler output" className="flex gap-5 overflow-x-auto border-b border-[var(--rule)] text-sm">
            {tabs.map(t => (
              <button
                key={t.id}
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls="tab-panel"
                onClick={() => setTab(t.id)}
                className={`-mb-px shrink-0 whitespace-nowrap border-b-2 pb-2 pt-1 ${
                  tab === t.id ? 'border-[var(--ink)] font-semibold' : 'border-transparent t-graphite hover:text-[var(--ink)]'
                }`}
              >
                {t.label}
                {t.count !== undefined && <span className="ml-1.5 t-faint t-num">{t.count}</span>}
              </button>
            ))}
          </div>

          <div id="tab-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="pt-5">
            {compiling && tab !== 'pipeline' ? (
              <div className="space-y-3" aria-label="Compiling">
                <div className="skel h-7 w-48" />
                <div className="skel h-4 w-full" />
                <div className="skel h-4 w-5/6" />
                <div className="skel h-4 w-2/3" />
              </div>
            ) : !result && !compiling ? (
              <p className="py-8 text-sm t-graphite">Press Compile and run to see each stage’s output here.</p>
            ) : (
              <>
                {tab === 'result' && result && <OutcomeCard result={result} />}
                {tab === 'pipeline' && <PipelineVisualization stages={result?.stages || []} isCompiling={compiling} />}
                {tab === 'tokens' && <TokenTable tokens={result?.tokens || []} />}
                {tab === 'parse' && (
                  result?.traceLines?.length ? (
                    <div className="listing max-h-[28rem]"><pre>{result.traceLines.join('\n')}</pre></div>
                  ) : (
                    <p className="py-8 text-sm t-graphite">The parser did not produce a trace. Check the Pipeline tab for the error.</p>
                  )
                )}
                {tab === 'ast' && <AstTree ast={result?.ast || null} />}
                {tab === 'cfg' && (
                  result?.irSource
                    ? <ControlFlowGraph ir={result.irSource} />
                    : <p className="py-8 text-sm t-graphite">No IR was generated because compilation stopped earlier.</p>
                )}
                {tab === 'opt' && (
                  <OptimizedIr before={result?.irSource || ''} after={result?.optimizedIr} error={result?.optimizeError} />
                )}
                {tab === 'ir' && (
                  result?.irSource ? (
                    <div className="space-y-2">
                      <div className="flex justify-end">
                        <button type="button" onClick={copyIr} className="btn btn-outline btn-sm">
                          {copied ? 'Copied' : 'Copy IR'}
                        </button>
                      </div>
                      <div className="listing max-h-[28rem]"><pre>{result.irSource}</pre></div>
                    </div>
                  ) : (
                    <p className="py-8 text-sm t-graphite">No IR was generated because compilation stopped earlier.</p>
                  )
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
