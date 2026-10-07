'use client';

import type { AlpcCompileResult } from '@/lib/api';
import { backwardDesignStatus } from './types';

/** The decision the compiled program reached, or the reasons it was rejected. */
export function OutcomeCard({ result, compact = false }: { result: AlpcCompileResult; compact?: boolean }) {
  const { success, outcome, alignmentScore, binaryOutput, content, diagnostics } = result;
  const bd = backwardDesignStatus(result);

  if (!success) {
    return (
      <div className="notice notice-error space-y-2" role="alert">
        <p className="font-semibold">Compilation failed, so the program was not run.</p>
        {diagnostics && diagnostics.length > 0 ? (
          <ul className="space-y-1">
            {diagnostics.map((d, i) => (
              <li key={i} className="font-[family-name:var(--font-mono)] text-[0.8125rem]">
                <span className="t-graphite">{d.stage}: </span>
                <span className="t-mark whitespace-pre-wrap">{d.message}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm">The compiler stopped without printing a diagnostic. Open the stage output to see why.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <dl className={`grid gap-x-8 gap-y-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
        <div>
          <dt className="text-sm t-graphite">Outcome</dt>
          <dd className="m-0 text-[1.375rem] font-semibold"><span className="ident">{outcome ?? 'none reached'}</span></dd>
        </div>
        <div>
          <dt className="text-sm t-graphite">Alignment score</dt>
          <dd className="m-0 text-[1.375rem] font-semibold t-num">{alignmentScore ?? 'not printed'}</dd>
        </div>
        {binaryOutput && (
          <div>
            <dt className="text-sm t-graphite">Binary output</dt>
            <dd className="m-0 text-[1.375rem] font-semibold"><span className="ident">{binaryOutput}</span></dd>
          </div>
        )}
      </dl>

      {bd === 'pass' && (
        <p className="text-sm t-pass">Backward Design check passed: every GOTO target is declared above it.</p>
      )}

      {content && !compact && content.steps.length > 0 && (
        <div className="section-rule pt-4">
          <p className="text-[0.9375rem]">{content.description}</p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-[0.9375rem]">
            {content.steps.map((step, i) => <li key={i}>{step}</li>)}
          </ol>
        </div>
      )}
    </div>
  );
}
