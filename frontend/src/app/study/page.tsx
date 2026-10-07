'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, getToken, type StudyTopic } from '@/lib/api';

function level(p: number) {
  return p >= 70 ? 'strong' : p >= 40 ? 'moderate' : 'weak';
}

export default function StudyIndexPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<StudyTopic[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    api.getStudyTopics()
      .then(r => setTopics([...r.topics].sort((a, b) => (a.masteryPercent ?? 101) - (b.masteryPercent ?? 101))))
      .catch(err => setError(err.message));
  }, [router]);

  return (
    <div className="mx-auto max-w-[60rem] px-4 py-8 sm:px-6">
      <header className="pb-8">
        <h1 className="text-[1.75rem]">Study</h1>
        <p className="mt-1 prose-measure text-[0.9375rem] t-graphite">
          Videos, articles, visualisations and problem sets for each topic. What a page shows first is decided by your
          pathway program: a low score starts you on introductions, a high one on harder material. Lowest mastery first.
        </p>
      </header>

      {error && <p className="notice notice-error" role="alert">{error}</p>}

      {!topics && !error && (
        <div className="space-y-3" aria-label="Loading topics">
          {Array.from({ length: 9 }).map((_, i) => <div key={i} className="skel h-5 w-full" />)}
        </div>
      )}

      {topics && (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Topic</th><th className="w-[30%]">Mastery</th><th className="w-12 text-right">%</th>
                <th>Last outcome</th><th className="text-right">Done</th>
              </tr>
            </thead>
            <tbody>
              {topics.map(t => (
                <tr key={t.skill}>
                  <td><Link href={`/study/${encodeURIComponent(t.skill)}`} className="link font-medium">{t.skill}</Link></td>
                  <td>
                    {t.masteryPercent == null ? <span className="text-sm t-faint">not measured</span> : (
                      <div className={`meter meter-${level(t.masteryPercent)}`} role="img" aria-label={`${t.masteryPercent} percent`}>
                        <span style={{ width: `${t.masteryPercent}%` }} />
                      </div>
                    )}
                  </td>
                  <td className="text-right t-num">{t.masteryPercent ?? ''}</td>
                  <td>{t.outcome ? <span className="ident">{t.outcome}</span> : <span className="t-faint">none yet</span>}</td>
                  <td className="whitespace-nowrap text-right t-num">{t.done} of {t.resources}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
