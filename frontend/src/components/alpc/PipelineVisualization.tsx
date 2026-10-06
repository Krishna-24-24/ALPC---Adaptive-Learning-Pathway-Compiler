'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { AlpcStage } from '@/lib/api';
import { STAGE_META, STAGE_ORDER, type StageId } from './types';

interface Props {
  stages: AlpcStage[];
  isCompiling?: boolean;
}

function StatusIcon({ status, spin }: { status: string; spin?: boolean }) {
  if (spin) {
    return (
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="h-4 w-4 rounded-full border-2 border-indigo-400 border-t-transparent flex-shrink-0"
      />
    );
  }
  if (status === 'success') return <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />;
  if (status === 'error')   return <XCircle    className="h-4 w-4 text-rose-400 flex-shrink-0"    />;
  if (status === 'skipped') return <div className="h-4 w-4 rounded-full border border-white/20 bg-white/5 flex-shrink-0" />;
  return <Clock className="h-4 w-4 text-white/25 flex-shrink-0" />;
}

export function PipelineVisualization({ stages, isCompiling }: Props) {
  const [expanded, setExpanded] = useState<StageId | null>(null);
  const stageMap = Object.fromEntries(stages.map(s => [s.id, s]));

  return (
    <div className="space-y-1">
      {STAGE_ORDER.map((stageId, idx) => {
        const stage  = stageMap[stageId];
        const meta   = STAGE_META[stageId];
        const status = stage?.status || 'pending';
        const isExp  = expanded === stageId;
        const hasContent = stage && (stage.stdout || stage.stderr);
        const isActive   = isCompiling && !stage;

        return (
          <div key={stageId}>
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <button
                onClick={() => hasContent && setExpanded(isExp ? null : stageId)}
                className={[
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left',
                  hasContent ? 'cursor-pointer' : 'cursor-default',
                  status === 'success' ? 'bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/8' :
                  status === 'error'   ? 'bg-rose-500/5 border border-rose-500/10 hover:bg-rose-500/8' :
                  status === 'skipped' ? 'bg-white/[0.015] border border-white/[0.04] opacity-40' :
                  isActive             ? 'bg-indigo-500/5 border border-indigo-500/15' :
                                         'bg-white/[0.02] border border-white/[0.05]',
                ].join(' ')}
              >
                <StatusIcon status={status} spin={isActive} />

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    status === 'success' ? 'text-emerald-300' :
                    status === 'error'   ? 'text-rose-300'    :
                    isActive             ? 'text-indigo-300'  :
                                           'text-white/40'
                  }`}>
                    {meta.label}
                  </p>
                  <p className="text-[10px] text-white/25">{meta.description}</p>
                </div>

                {hasContent && (
                  <span className="text-white/25">
                    {isExp ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </span>
                )}
              </button>
            </motion.div>

            <AnimatePresence>
              {isExp && hasContent && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="mt-1 ml-7 rounded-lg bg-black/30 border border-white/[0.05] overflow-hidden"
                >
                  {stage.stderr && (
                    <pre className="p-3 text-[11px] text-rose-300 font-mono leading-relaxed whitespace-pre-wrap break-all">
                      {stage.stderr}
                    </pre>
                  )}
                  {stage.stdout && (
                    <pre className="p-3 text-[11px] text-white/55 font-mono leading-relaxed whitespace-pre-wrap break-all max-h-52 overflow-y-auto">
                      {stage.stdout.length > 2000 ? stage.stdout.slice(0, 2000) + '\n… (truncated)' : stage.stdout}
                    </pre>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {idx < STAGE_ORDER.length - 1 && (
              <div className="ml-5 my-0.5 w-px h-2.5 bg-white/[0.08]" />
            )}
          </div>
        );
      })}
    </div>
  );
}
