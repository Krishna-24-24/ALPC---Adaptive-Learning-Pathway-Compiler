'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, type AdaptiveResult, type AlpcCompileResult } from '@/lib/api';
import { OutcomeCard } from '@/components/alpc/OutcomeCard';
import { PipelineVisualization } from '@/components/alpc/PipelineVisualization';

export default function ResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<AdaptiveResult | null>(null);
  const [decision, setDecision] = useState<(AlpcCompileResult & { source?: string }) | null>(null);
  const [compiling, setCompiling] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [showTrace, setShowTrace] = useState(false);
  const [studySkill, setStudySkill] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('learnsmart_quiz_result');
    if (!raw) { router.push('/dashboard'); return; }
    const parsed: AdaptiveResult = JSON.parse(raw);
    setResult(parsed);

    // Compile the student's next step with ALPC from this quiz's numbers.
    const skill = parsed.recommendations?.[0]?.skill || parsed.results?.[0]?.skill;
    if (skill) {
      setStudySkill(skill);
      setCompiling(true);
      api.generatePathway({
        skill,
        performance: parsed.summary.scorePercent,
        mastery: parsed.recommendations?.[0]?.masteryScore ?? 0.5,
      })
        .then(setDecision)
        .catch(err => setDecisionError(err instanceof Error ? err.message : 'The compiler decision failed.'))
        .finally(() => setCompiling(false));
    }
  }, [router]);

  if (!result) {
    return (
      <div className="mx-auto max-w-[48rem] px-4 py-8 sm:px-6" aria-label="Loading results">
        <div className="skel h-8 w-72" />
        <div className="skel mt-3 h-4 w-96 max-w-full" />
      </div>
    );
  }

  const { summary, results, recommendations, analytics } = result;
  const focus = recommendations[0];

  return (
    <div className="mx-auto max-w-[48rem] px-4 py-8 sm:px-6">
      <header className="pb-8">
        <p className="text-sm t-graphite">Practice quiz results</p>
        <h1 className="mt-1 text-[2rem]">
          {summary.correct} of {summary.total} correct
        </h1>
        <p className="mt-2 text-[0.9375rem] t-graphite">
          Score {summary.scorePercent}%.
          {analytics && <> Your average mastery is now {analytics.averageMasteryPercent}%.</>}
        </p>
      </header>

      <div className="space-y-12">
        <section aria-labelledby="decision-h" className="panel space-y-4 p-5">
          <div>
            <h2 id="decision-h" className="text-lg">What to do next</h2>
            <p className="mt-1 text-sm t-graphite">
              Your score was written into a Path-Lang program and compiled by ALPC. The outcome it reached is your next step.
            </p>
          </div>
          {compiling && (
            <div className="space-y-2" aria-label="Compiling"><div className="skel h-7 w-40" /><div className="skel h-4 w-64" /></div>
          )}
          {decisionError && <p className="notice notice-error" role="alert">{decisionError}</p>}
          {decision && (
            <>
              <OutcomeCard result={decision} />
              <div className="flex flex-wrap gap-2">
                {studySkill && (
                  <Link href={`/study/${encodeURIComponent(studySkill)}`} className="btn btn-primary btn-sm">Study {studySkill}</Link>
                )}
                <button type="button" className="btn btn-outline btn-sm" aria-expanded={showTrace} onClick={() => setShowTrace(v => !v)}>
                  {showTrace ? 'Hide compiler trace' : 'Show compiler trace'}
                </button>
                {decision.decisionId && (
                  <Link href={`/history/${decision.decisionId}`} className="btn btn-quiet btn-sm">Why this?</Link>
                )}
                <Link href="/compiler" className="btn btn-quiet btn-sm">Open the playground</Link>
              </div>
              {showTrace && (
                <div className="space-y-4">
                  {decision.source && <div className="listing"><pre>{decision.source}</pre></div>}
                  <PipelineVisualization stages={decision.stages} />
                </div>
              )}
            </>
          )}
        </section>

        {focus && (
          <section aria-labelledby="focus-h">
            <h2 id="focus-h" className="text-lg">Focus on {focus.skill}</h2>
            <p className="mt-2">{focus.explanation}</p>
            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-sm t-graphite">Mastery</dt>
                <dd className="m-0 font-medium t-num">{focus.masteryPercent}%</dd>
              </div>
              {focus.commonError && (
                <div>
                  <dt className="text-sm t-graphite">Common mistake</dt>
                  <dd className="m-0 text-[0.9375rem]">{focus.commonError}</dd>
                </div>
              )}
              {focus.suggestedAction && (
                <div>
                  <dt className="text-sm t-graphite">Try this</dt>
                  <dd className="m-0 text-[0.9375rem]">{focus.suggestedAction}</dd>
                </div>
              )}
            </dl>
          </section>
        )}

        <section aria-labelledby="answers-h">
          <h2 id="answers-h" className="text-lg">Your answers</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="table">
              <thead><tr><th className="w-10">#</th><th>Topic</th><th>Answer</th><th className="text-right">Mastery after</th></tr></thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={r.questionId}>
                    <td className="t-faint t-num">{i + 1}</td>
                    <td>{r.skill}</td>
                    <td className={r.correct ? 't-pass' : 't-mark'}>{r.correct ? 'Correct' : 'Wrong'}</td>
                    <td className="text-right t-num">{Math.round(r.updatedMastery * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {recommendations.length > 1 && (
          <section aria-labelledby="more-h">
            <h2 id="more-h" className="text-lg">Other topics to review</h2>
            <ul className="mt-3 divide-y divide-[var(--rule-soft)] border-y border-[var(--rule-soft)]">
              {recommendations.slice(1).map(rec => (
                <li key={rec.skill} className="py-3">
                  <p className="font-medium">{rec.skill} <span className="font-normal t-graphite t-num">{rec.masteryPercent}%</span></p>
                  <p className="mt-1 text-sm">{rec.explanation}</p>
                  {rec.suggestedAction && <p className="mt-1 text-sm t-graphite">Try this: {rec.suggestedAction}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard" className="btn btn-primary">Back to the dashboard</Link>
          <Link href="/quiz/adaptive" className="btn btn-outline">Take another practice quiz</Link>
        </div>
      </div>
    </div>
  );
}
