'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Play, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { api, type AlpcCompileResult } from '@/lib/api';
import { OutcomeCard } from './OutcomeCard';
import { PipelineVisualization } from './PipelineVisualization';

const TIER_STYLES: Record<string, { badge: string; glow: string }> = {
  remedial: { badge: 'bg-rose-500/20 text-rose-300 border-rose-500/20', glow: 'shadow-rose-500/10' },
  practice: { badge: 'bg-amber-500/20 text-amber-300 border-amber-500/20', glow: 'shadow-amber-500/10' },
  core: { badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/20', glow: 'shadow-indigo-500/10' },
  advanced: { badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/20', glow: 'shadow-emerald-500/10' },
};

interface AdaptiveEngineSectionProps {
  skill: string;
  performance: number;
  mastery: number;
}

export function AdaptiveEngineSection({ skill, performance, mastery }: AdaptiveEngineSectionProps) {
  const [result, setResult] = useState<AlpcCompileResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPipeline, setShowPipeline] = useState(false);

  const runPathway = useCallback(async () => {
    setIsRunning(true);
    setError(null);
    try {
      const res = await api.generatePathway({
        skill,
        performance,
        mastery,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run adaptive pathway');
    } finally {
      setIsRunning(false);
    }
  }, [skill, performance, mastery]);

  const tier = result?.outcome?.toLowerCase() || 'core';
  const tierStyle = TIER_STYLES[tier] || TIER_STYLES.core;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className="card p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/12 border border-indigo-500/20">
            <Cpu className="h-3.5 w-3.5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-600 text-[var(--text-primary)]" style={{ fontWeight: 600 }}>Adaptive Learning Engine</h2>
            <p className="text-[10px] text-[var(--text-muted)]">ALPC compiler-driven pathway</p>
          </div>
        </div>
        {result?.outcome && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${tierStyle.badge}`}>
            {result.outcome}
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5">
          <p className="text-[9px] text-white/40 uppercase tracking-wide mb-0.5">Topic</p>
          <p className="text-sm font-600 text-[var(--text-primary)] truncate" style={{ fontWeight: 600 }}>{skill}</p>
        </div>
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5">
          <p className="text-[9px] text-white/40 uppercase tracking-wide mb-0.5">Performance</p>
          <p className="text-sm font-600 text-[var(--text-primary)]" style={{ fontWeight: 600 }}>{Math.round(performance)}%</p>
        </div>
        {result && (
          <>
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5">
              <p className="text-[9px] text-white/40 uppercase tracking-wide mb-0.5">Alignment Score</p>
              <p className={`text-sm font-700 ${result.alignmentScore !== null ? 'text-indigo-300' : 'text-white/40'}`} style={{ fontWeight: 700 }}>
                {result.alignmentScore ?? '—'}
              </p>
            </div>
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5">
              <p className="text-[9px] text-white/40 uppercase tracking-wide mb-0.5">Compiler Decision</p>
              <p className={`text-sm font-700 uppercase ${tierStyle.badge.split(' ').find(c => c.startsWith('text-')) || 'text-white/70'}`} style={{ fontWeight: 700 }}>
                {result.outcome ?? '—'}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Result card */}
      {result && (
        <div className="mb-3 space-y-2">
          <OutcomeCard result={result} compact />

          {/* Pipeline toggle */}
          <button
            onClick={() => setShowPipeline(!showPipeline)}
            className="flex items-center gap-1.5 text-xs text-indigo-300 hover:text-indigo-200 transition-colors"
          >
            <Cpu className="h-3 w-3" />
            {showPipeline ? 'Hide Compiler Trace' : 'View Compiler Trace'}
          </button>

          {showPipeline && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="rounded-xl border border-white/[0.06] bg-black/20 p-3"
            >
              <PipelineVisualization stages={result.stages} />
            </motion.div>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-rose-400 mb-3">{error}</p>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={runPathway}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-600 bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ fontWeight: 600 }}
        >
          <Play className="h-3 w-3" />
          {isRunning ? 'Compiling…' : result ? 'Re-run Pathway' : 'Run Adaptive Pathway'}
        </button>
        <Link
          href="/compiler"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-[var(--text-secondary)] border border-[var(--border-default)] hover:border-[var(--border-strong)] transition-all"
        >
          <ExternalLink className="h-3 w-3" />
          Open Playground
        </Link>
      </div>
    </motion.section>
  );
}
