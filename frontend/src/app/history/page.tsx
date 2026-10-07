'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, getToken, type AlpcDecision } from '@/lib/api';

function when(iso: string) {
  return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function HistoryPage() {
  const router = useRouter();
  const [decisions, setDecisions] = useState<AlpcDecision[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    api.getAlpcDecisions()
      .then(r => setDecisions(r.decisions))
      .catch(err => setError(err.message));
  }, [router]);

  return (
    <div className="mx-auto max-w-[60rem] px-4 py-8 sm:px-6">
      <header className="pb-8">
        <h1 className="text-[1.75rem]">Decision history</h1>
        <p className="mt-1 prose-measure text-[0.9375rem] t-graphite">
          Every recommendation you received was made by compiling a Path-Lang program from your numbers. Open one to
          see the program, the rule that decided it, and each compiler stage.
        </p>
      </header>

      {error && <p className="notice notice-error" role="alert">{error}</p>}

      {!decisions && !error && (
        <div className="space-y-3" aria-label="Loading decisions">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skel h-5 w-full" />)}
        </div>
      )}

      {decisions && decisions.length === 0 && (
        <div className="py-6">
          <p>No decisions yet. One is made each time you finish a practice quiz or run the pathway on your dashboard.</p>
          <Link href="/quiz/adaptive" className="btn btn-primary mt-5">Take a practice quiz</Link>
        </div>
      )}

      {decisions && decisions.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>When</th><th>Topic</th><th className="text-right">Performance</th><th className="text-right">Mastery</th>
                <th>Outcome</th><th className="text-right">Score</th><th><span className="sr-only">Details</span></th>
              </tr>
            </thead>
            <tbody>
              {decisions.map(d => (
                <tr key={d._id}>
                  <td className="whitespace-nowrap t-graphite">{when(d.createdAt)}</td>
                  <td className="font-medium">{d.skill}</td>
                  <td className="text-right t-num">{Math.round(d.performance)}</td>
                  <td className="text-right t-num">{Math.round((d.mastery <= 1 ? d.mastery * 100 : d.mastery))}</td>
                  <td>{d.outcome ? <span className="ident">{d.outcome}</span> : <span className="t-faint">none</span>}</td>
                  <td className="text-right t-num">{d.alignmentScore ?? ''}</td>
                  <td className="text-right"><Link href={`/history/${d._id}`} className="link whitespace-nowrap">Why this?</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
