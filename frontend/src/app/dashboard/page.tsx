'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, getToken, getUser, type DashboardData } from '@/lib/api';
import { AdaptiveEngineSection } from '@/components/alpc/AdaptiveEngineSection';

const LEVEL_TEXT = { weak: 'Needs work', moderate: 'Developing', strong: 'Strong' } as const;

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-[76rem] px-4 py-8 sm:px-6" aria-label="Loading your dashboard">
      <div className="skel h-8 w-64" />
      <div className="skel mt-3 h-4 w-96 max-w-full" />
      <div className="mt-10 grid gap-10 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          {Array.from({ length: 9 }).map((_, i) => <div key={i} className="skel h-5 w-full" />)}
        </div>
        <div className="space-y-3">
          <div className="skel h-6 w-40" />
          <div className="skel h-4 w-full" />
          <div className="skel h-4 w-5/6" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [history, setHistory] = useState<{ date: string; accuracy: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    setName(getUser()?.name || '');
    Promise.all([api.getDashboard(), api.getHistory()])
      .then(([dash, hist]) => { setData(dash); setHistory(hist.improvementOverTime || []); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return <DashboardSkeleton />;

  if (error || !data) {
    return (
      <div className="mx-auto max-w-[76rem] px-4 py-16 sm:px-6">
        <h1 className="text-[1.75rem]">The dashboard could not load</h1>
        <p className="mt-2 t-graphite">{error || 'The server returned no data.'}</p>
        <button type="button" onClick={() => window.location.reload()} className="btn btn-outline mt-6">Try again</button>
      </div>
    );
  }

  const { analytics } = data;
  const skills = [...data.skills].sort((a, b) => a.masteryPercent - b.masteryPercent);
  const weakest = data.weakestSkills[0] ?? null;

  return (
    <div className="mx-auto max-w-[76rem] px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4 pb-8">
        <div>
          <h1 className="text-[1.75rem]">{name ? `${name}’s progress` : 'Your progress'}</h1>
          <p className="mt-1 text-[0.9375rem] t-graphite">
            Average mastery {analytics.averageMasteryPercent}% across {data.skills.length} topics. Weakest is{' '}
            {analytics.weakestSkill.skill}, strongest is {analytics.strongestSkill.skill}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {weakest && (
            <Link href={`/study/${encodeURIComponent(weakest.skill)}`} className="btn btn-primary">Study {weakest.skill}</Link>
          )}
          <Link href="/quiz/adaptive" className="btn btn-outline">Practice quiz</Link>
        </div>
      </header>

      <div className="grid gap-12 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-12">
          <section aria-labelledby="mastery-h">
            <h2 id="mastery-h" className="text-lg">Mastery by topic</h2>
            <p className="mt-1 text-sm t-graphite">Estimated with Bayesian Knowledge Tracing from every answer you have given. Lowest first.</p>
            <div className="mt-4 overflow-x-auto">
              <table className="table">
                <thead>
                  <tr><th>Topic</th><th className="w-[40%]">Mastery</th><th className="w-14 text-right">%</th><th className="w-28">Level</th></tr>
                </thead>
                <tbody>
                  {skills.map(s => (
                    <tr key={s.skill}>
                      <td className="font-medium">{s.skill}</td>
                      <td>
                        <div className={`meter meter-${s.level}`} role="img" aria-label={`${s.masteryPercent} percent`}>
                          <span style={{ width: `${s.masteryPercent}%` }} />
                        </div>
                      </td>
                      <td className="text-right t-num">{s.masteryPercent}</td>
                      <td className={s.level === 'weak' ? 't-mark' : s.level === 'strong' ? 't-pass' : 't-caution'}>{LEVEL_TEXT[s.level]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="history-h">
            <h2 id="history-h" className="text-lg">Accuracy by week</h2>
            {history.length === 0 ? (
              <p className="mt-2 text-sm t-graphite">Finish a practice quiz to start this chart.</p>
            ) : (
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="var(--rule-soft)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: 'var(--graphite)', fontSize: 12 }} axisLine={{ stroke: 'var(--rule)' }} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: 'var(--graphite)', fontSize: 12 }} axisLine={false} tickLine={false} unit="%" />
                    <Tooltip formatter={v => [`${v ?? ''}%`, 'Accuracy']} labelStyle={{ color: 'var(--graphite)' }} itemStyle={{ color: 'var(--ink)' }} />
                    <Line type="linear" dataKey="accuracy" stroke="var(--ink)" strokeWidth={2} dot={{ r: 3, fill: 'var(--ink)' }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        </div>

        <div className="min-w-0 space-y-12">
          {data.nextTopic && (
            <section aria-labelledby="next-h" className="panel p-5">
              <h2 id="next-h" className="text-lg">Study next: {data.nextTopic.skill}</h2>
              <p className="mt-2 text-[0.9375rem]">{data.nextTopic.reason}</p>
              <p className="mt-2 text-sm t-graphite">Current mastery {data.nextTopic.masteryPercent}%.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/study/${encodeURIComponent(data.nextTopic.skill)}`} className="btn btn-outline btn-sm">Open the study page</Link>
                <Link href="/quiz/adaptive" className="btn btn-quiet btn-sm">Start a practice quiz</Link>
              </div>
            </section>
          )}

          {data.review && data.review.length > 0 && (
            <section aria-labelledby="review-h">
              <h2 id="review-h" className="text-lg">Due for review</h2>
              <p className="mt-1 text-sm t-graphite">
                Topics you have not practised for a while. Weaker topics come back sooner: every 2 days below 40%,
                every 4 below 70%, otherwise weekly.
              </p>
              <ul className="mt-3 divide-y divide-[var(--rule-soft)] border-y border-[var(--rule-soft)]">
                {data.review.slice(0, 4).map(r => (
                  <li key={r.skill} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5">
                    <div>
                      <p className="font-medium">{r.skill}</p>
                      <p className="text-sm t-graphite">
                        Last practised {r.daysSince} days ago · mastery <span className="t-num">{r.masteryPercent}%</span>
                      </p>
                    </div>
                    <Link href={`/quiz/adaptive?skill=${encodeURIComponent(r.skill)}`} className="btn btn-outline btn-sm">Review</Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {weakest && (
            <AdaptiveEngineSection
              skill={weakest.skill}
              performance={weakest.masteryPercent}
              mastery={weakest.masteryScore}
            />
          )}

          {data.learningPath.length > 0 && (
            <section aria-labelledby="path-h">
              <h2 id="path-h" className="text-lg">Suggested order</h2>
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-[0.9375rem]">
                {data.learningPath.map((skill, i) => (
                  <li key={skill} className={i === 0 ? 'font-semibold' : ''}>{skill}{i === 0 && <span className="font-normal t-graphite">, start here</span>}</li>
                ))}
              </ol>
            </section>
          )}

          {data.recommendations.length > 0 && (
            <section aria-labelledby="recs-h">
              <h2 id="recs-h" className="text-lg">Notes on your answers</h2>
              <ul className="mt-3 divide-y divide-[var(--rule-soft)] border-y border-[var(--rule-soft)]">
                {data.recommendations.slice(0, 3).map(rec => (
                  <li key={rec.skill} className="py-3">
                    <p className="font-medium">{rec.skill}</p>
                    <p className="mt-1 text-sm">{rec.explanation}</p>
                    {rec.suggestedAction && <p className="mt-1 text-sm t-graphite">Next: {rec.suggestedAction}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
