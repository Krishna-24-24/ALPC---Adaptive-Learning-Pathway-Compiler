'use client';

import { useEffect, useState } from 'react';
import type { AlpcStage } from '@/lib/api';
import { STAGE_META, STAGE_ORDER, type StageId } from './types';

const STATUS_TEXT: Record<string, { text: string; cls: string }> = {
  success: { text: 'passed', cls: 'status-ok' },
  error: { text: 'failed', cls: 'status-fail' },
  skipped: { text: 'not run', cls: 'status-skip' },
  pending: { text: 'waiting', cls: 'status-wait' },
  running: { text: 'running', cls: 'status-wait' },
};

/** The five compiler stages in order, each with its status and real stdout/stderr on request. */
export function PipelineVisualization({ stages, isCompiling }: { stages: AlpcStage[]; isCompiling?: boolean }) {
  const [open, setOpen] = useState<StageId | null>(null);
  const byId = Object.fromEntries(stages.map(s => [s.id, s])) as Partial<Record<StageId, AlpcStage>>;
  const failed = stages.find(s => s.status === 'error')?.id ?? null;

  // A failed stage opens by itself so the diagnostic is visible without a click.
  useEffect(() => { setOpen(failed); }, [failed, stages]);

  return (
    <ol className="border-t border-[var(--rule)]">
      {STAGE_ORDER.map((id, i) => {
        const stage = byId[id];
        const status = stage?.status ?? (isCompiling ? 'running' : 'pending');
        const s = STATUS_TEXT[status];
        const output = stage ? [stage.stderr, stage.stdout].filter(Boolean).join('\n').trim() : '';
        const isOpen = open === id;
        return (
          <li key={id} className="border-b border-[var(--rule)]">
            <div className="flex items-baseline gap-3 py-2.5">
              <span className="w-4 text-right text-sm t-faint t-num">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.9375rem] font-medium">{STAGE_META[id].label}</p>
                <p className="text-xs t-graphite">{STAGE_META[id].tool}</p>
              </div>
              {status === 'running' ? (
                <span className="skel h-3 w-14" aria-label="running" />
              ) : (
                <span className={`status ${s.cls}`}>{s.text}</span>
              )}
              {output && (
                <button
                  type="button"
                  className="btn btn-quiet btn-sm"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : id)}
                >
                  {isOpen ? 'Hide output' : 'Show output'}
                </button>
              )}
            </div>
            {isOpen && output && (
              <div className="listing listing-wrap mb-3 ml-7 max-h-64">
                <pre className={stage?.status === 'error' ? 't-mark' : ''}>
                  {output.length > 4000 ? output.slice(0, 4000) + '\n(truncated)' : output}
                </pre>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
