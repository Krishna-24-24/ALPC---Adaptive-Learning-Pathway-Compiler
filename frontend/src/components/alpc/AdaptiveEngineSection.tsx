'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { api, type AlpcCompileResult } from '@/lib/api';
import { OutcomeCard } from './OutcomeCard';
import { PipelineVisualization } from './PipelineVisualization';

interface Props {
  skill: string;
  performance: number;
  mastery: number;
}

/** Generates a Path-Lang program from the student's numbers, compiles and runs it on the backend. */
export function AdaptiveEngineSection({ skill, performance, mastery }: Props) {
  const [result, setResult] = useState<(AlpcCompileResult & { source?: string }) | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTrace, setShowTrace] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      setResult(await api.generatePathway({ skill, performance, mastery }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The pathway could not be compiled.');
    } finally {
      setRunning(false);
    }
  }, [skill, performance, mastery]);

  return (
    <section aria-labelledby="engine-h" className="space-y-4">
      <div>
        <h2 id="engine-h" className="text-lg">Compiler decision</h2>
        <p className="mt-1 text-sm t-graphite">
          Writes your numbers for <strong className="font-medium text-[var(--ink)]">{skill}</strong> into a Path-Lang
          program (performance {Math.round(performance)}, mastery {Math.round(mastery * 100)}), compiles it with ALPC
          and runs it.
        </p>
      </div>

      {running && !result && (
        <div className="space-y-2" aria-label="Compiling">
          <div className="skel h-6 w-40" />
          <div className="skel h-4 w-64" />
        </div>
      )}

      {result && <OutcomeCard result={result} compact />}
      {error && <p className="notice notice-error">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={run} disabled={running} className="btn btn-primary btn-sm">
          {running ? 'Compiling…' : result ? 'Run again' : 'Run the pathway'}
        </button>
        {result && (
          <button type="button" className="btn btn-outline btn-sm" aria-expanded={showTrace} onClick={() => setShowTrace(v => !v)}>
            {showTrace ? 'Hide compiler trace' : 'Show compiler trace'}
          </button>
        )}
        <Link href="/compiler" className="btn btn-quiet btn-sm">Open the playground</Link>
      </div>

      {showTrace && result && (
        <div className="space-y-4">
          {result.source && (
            <div className="listing"><pre>{result.source}</pre></div>
          )}
          <PipelineVisualization stages={result.stages} />
        </div>
      )}
    </section>
  );
}
