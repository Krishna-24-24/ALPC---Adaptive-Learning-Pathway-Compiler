'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, RotateCcw, Copy, Check, Code2, Cpu } from 'lucide-react';
import { api, type AlpcCompileResult } from '@/lib/api';
import { PathLangEditor } from '@/components/alpc/PathLangEditor';
import { PipelineVisualization } from '@/components/alpc/PipelineVisualization';
import { TokenTable } from '@/components/alpc/TokenTable';
import { AstTree } from '@/components/alpc/AstTree';
import { OutcomeCard } from '@/components/alpc/OutcomeCard';

const DEFAULT_SOURCE = `OUTCOME remedial;
OUTCOME core;
OUTCOME advanced;

SET performance = 72;
SET state = 0;

IF performance < 50 GOTO remedial;
IF performance < 80 GOTO core;
IF performance >= 80 GOTO advanced;`;

const EXAMPLES = [
  { label: 'Basic pathway', source: DEFAULT_SOURCE },
  {
    label: '4-tier adaptive',
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
    label: 'Binary output (; b)',
    source: `OUTCOME remedial;
OUTCOME core;
OUTCOME advanced;

SET performance = 60;
SET state = 0;
SET state += 15;

IF performance < 70 GOTO remedial; b
IF performance < 80 GOTO core;
IF performance >= 80 GOTO advanced;`,
  },
  {
    label: 'Backward Design violation (error)',
    source: `IF performance < 50 GOTO remedial;

OUTCOME remedial;
OUTCOME core;

SET performance = 40;
SET state = 0;`,
  },
];

type TabId = 'pipeline' | 'tokens' | 'parse' | 'ast' | 'ir' | 'result';

export default function CompilerPlayground() {
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [result, setResult] = useState<AlpcCompileResult | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('pipeline');
  const [copied, setCopied] = useState(false);

  const compile = useCallback(async () => {
    setIsCompiling(true);
    setError(null);
    setResult(null);
    setActiveTab('pipeline');
    try {
      const res = await api.compilePathLang(source);
      setResult(res);
      if (res.success) setActiveTab('result');
      else setActiveTab('pipeline');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Compile request failed');
    } finally {
      setIsCompiling(false);
    }
  }, [source]);

  const copyIr = useCallback(async () => {
    if (!result?.irSource) return;
    await navigator.clipboard.writeText(result.irSource);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'pipeline', label: 'Pipeline' },
    { id: 'tokens', label: 'Tokens', count: result?.tokens?.length },
    { id: 'parse', label: 'Parse Trace', count: result?.traceLines?.length },
    { id: 'ast', label: 'AST' },
    { id: 'ir', label: 'LLVM IR' },
    { id: 'result', label: 'Result' },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-[var(--bg-base)]/80 backdrop-blur-xl sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/15 border border-indigo-500/20">
              <Cpu className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[var(--text-primary)]">ALPC Compiler Playground</h1>
              <p className="text-[11px] text-[var(--text-muted)]">Path-Lang &rarr; Flex &rarr; Bison &rarr; AST &rarr; LLVM IR &rarr; Execution</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              aria-label="Load example pathway"
              onChange={e => {
                const ex = EXAMPLES.find(x => x.label === e.target.value);
                if (ex) setSource(ex.source);
              }}
              className="text-xs bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-secondary)] outline-none focus:border-indigo-500/50"
            >
              <option value="">Load example...</option>
              {EXAMPLES.map(ex => (
                <option key={ex.label} value={ex.label}>{ex.label}</option>
              ))}
            </select>
            <button
              onClick={() => setSource(DEFAULT_SOURCE)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-[var(--text-secondary)] border border-[var(--border-default)] hover:border-[var(--border-strong)] transition-all cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
            <button
              onClick={compile}
              disabled={isCompiling}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-indigo-600/20"
            >
              <Play className="h-3.5 w-3.5" />
              {isCompiling ? 'Compiling...' : 'Compile & Run'}
            </button>
          </div>
        </div>
      </div>

      {/* Main split layout */}
      <div className="max-w-7xl mx-auto px-5 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Editor */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-indigo-400" />
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Path-Lang Source</p>
            </div>
            <span className="text-[11px] text-[var(--text-muted)] font-mono">.edu specification</span>
          </div>

          <PathLangEditor value={source} onChange={setSource} minRows={18} />

          {error && (
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3.5">
              <p className="text-xs text-rose-300 font-mono">{error}</p>
            </div>
          )}

          {/* Backward Design callout */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3.5 space-y-1"
          >
            <p className="text-[10px] text-white/40 uppercase tracking-wide font-medium">Backward Design Principle</p>
            <p className="text-xs text-white/70 leading-relaxed">
              Path-Lang enforces Wiggins &amp; McTighe&apos;s Backward Design: every learning <code className="text-violet-300 font-mono text-[11px]">OUTCOME</code> must be explicitly declared before any conditional <code className="text-amber-300 font-mono text-[11px]">IF ... GOTO</code> branch references it.
            </p>
          </motion.div>
        </div>

        {/* Right: Output panels */}
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-transparent'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="text-[9px] font-bold bg-white/10 rounded px-1.5 py-0.2">{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-overlay)] p-4 min-h-[380px]">
            {activeTab === 'pipeline' && (
              <div>
                <p className="text-xs text-white/40 mb-3 uppercase tracking-wide font-medium">Compiler Pipeline Execution</p>
                {isCompiling || result ? (
                  <PipelineVisualization
                    stages={result?.stages || []}
                    isCompiling={isCompiling}
                  />
                ) : (
                  <p className="text-center text-white/30 text-sm py-16">Click &quot;Compile &amp; Run&quot; to execute the pipeline.</p>
                )}
              </div>
            )}

            {activeTab === 'tokens' && (
              <div>
                <p className="text-xs text-white/40 mb-3 uppercase tracking-wide font-medium">Token Stream (Flex Lexer)</p>
                <TokenTable tokens={result?.tokens || []} />
              </div>
            )}

            {activeTab === 'parse' && (
              <div>
                <p className="text-xs text-white/40 mb-3 uppercase tracking-wide font-medium">Parse Trace (Bison LALR Grammar Reductions)</p>
                {result?.traceLines && result.traceLines.length > 0 ? (
                  <div className="overflow-auto max-h-96 rounded-lg border border-white/[0.06] p-3 bg-black/20 font-mono">
                    {result.traceLines.map((line, i) => (
                      <p key={i} className="text-[11px] text-white/60 leading-relaxed py-0.5 hover:bg-white/[0.02] px-1 rounded">
                        {line}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-white/30 text-sm py-16">No parse trace available yet.</p>
                )}
              </div>
            )}

            {activeTab === 'ast' && (
              <div>
                <p className="text-xs text-white/40 mb-3 uppercase tracking-wide font-medium">Abstract Syntax Tree (LLVM-style RTTI)</p>
                <AstTree ast={result?.ast || null} />
              </div>
            )}

            {activeTab === 'ir' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-white/40 uppercase tracking-wide font-medium">Generated LLVM IR</p>
                  {result?.irSource && (
                    <button
                      onClick={copyIr}
                      className="flex items-center gap-1.5 text-xs text-indigo-300 hover:text-indigo-200 transition-colors cursor-pointer"
                    >
                      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      {copied ? 'Copied' : 'Copy IR'}
                    </button>
                  )}
                </div>
                {result?.irSource ? (
                  <pre className="text-[11px] font-mono text-white/70 leading-relaxed overflow-auto max-h-96 p-3 bg-black/25 rounded-lg border border-white/[0.06] whitespace-pre">
                    {result.irSource}
                  </pre>
                ) : (
                  <p className="text-center text-white/30 text-sm py-16">No LLVM IR generated yet.</p>
                )}
              </div>
            )}

            {activeTab === 'result' && (
              <div>
                <p className="text-xs text-white/40 mb-3 uppercase tracking-wide font-medium">Execution &amp; Recommendation Result</p>
                {result ? (
                  <OutcomeCard result={result} />
                ) : (
                  <p className="text-center text-white/30 text-sm py-16">No result yet.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
