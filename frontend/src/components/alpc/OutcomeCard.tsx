'use client';

import { motion } from 'framer-motion';
import { CheckCircle, XCircle } from 'lucide-react';
import type { AlpcCompileResult } from '@/lib/api';

const TIER_STYLES: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  remedial: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    text: 'text-rose-300',
    badge: 'bg-rose-500/20 text-rose-300 border border-rose-500/20',
  },
  practice: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    text: 'text-amber-300',
    badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/20',
  },
  core: {
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
    text: 'text-indigo-300',
    badge: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/20',
  },
  advanced: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-300',
    badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20',
  },
};

function getTierStyle(outcome: string | null) {
  if (!outcome) return TIER_STYLES.core;
  return TIER_STYLES[outcome.toLowerCase()] || TIER_STYLES.core;
}

interface OutcomeCardProps {
  result: AlpcCompileResult;
  compact?: boolean;
}

export function OutcomeCard({ result, compact = false }: OutcomeCardProps) {
  const { success, outcome, alignmentScore, binaryOutput, content, diagnostics } = result;
  const style = getTierStyle(outcome);

  if (!success) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <XCircle className="h-4 w-4 text-rose-400" />
          <p className="text-sm font-semibold text-rose-300">Compilation Failed</p>
        </div>
        {diagnostics && diagnostics.length > 0 ? (
          diagnostics.map((d, i) => (
            <p key={i} className="text-xs font-mono text-rose-400/80 mt-1">
              [{d.stage}] {d.message}
            </p>
          ))
        ) : (
          <p className="text-xs text-rose-400/80">Compilation or execution failed without diagnostics.</p>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border ${style.border} ${style.bg} p-4 space-y-3`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-emerald-400" />
          <p className="text-sm font-semibold text-[var(--text-primary)]">Compilation Successful</p>
        </div>
        {outcome && (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${style.badge}`}>
            {outcome}
          </span>
        )}
      </div>

      <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
        <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-3 text-center">
          <p className="text-[10px] text-white/40 uppercase tracking-wide mb-1">Alignment Score</p>
          <p className={`text-2xl font-bold ${style.text}`}>{alignmentScore ?? '—'}</p>
        </div>
        <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-3 text-center">
          <p className="text-[10px] text-white/40 uppercase tracking-wide mb-1">Selected Path</p>
          <p className={`text-sm font-bold uppercase ${style.text}`}>{outcome ?? '—'}</p>
        </div>
        {!compact && binaryOutput && (
          <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-3 text-center">
            <p className="text-[10px] text-white/40 uppercase tracking-wide mb-1">Binary Output</p>
            <p className="text-sm font-mono font-bold text-purple-300 break-all">{binaryOutput}</p>
          </div>
        )}
      </div>

      {content && !compact && (
        <div className="pt-2 border-t border-white/[0.06]">
          <p className="text-xs text-white/40 mb-2">{content.description}</p>
          <ol className="space-y-1.5">
            {content.steps.map((step, i) => (
              <li key={i} className="flex items-center gap-2 text-xs">
                <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${style.badge}`}>
                  {i + 1}
                </span>
                <span className="text-white/70">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </motion.div>
  );
}
