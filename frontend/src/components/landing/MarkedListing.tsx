'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api, type AlpcCompileResult } from '@/lib/api';
import { highlightPathLang } from '@/lib/pathlang';
import { DEMO_TEMPLATE, RECORDED_PERFORMANCE, RECORDED_RUN } from '@/lib/recordedRun';

export type DemoRun = {
  performance: number;
  source: string;
  result: Pick<AlpcCompileResult, 'success' | 'outcome' | 'alignmentScore' | 'tokens' | 'traceLines' | 'irSource'> & {
    diagnostics?: AlpcCompileResult['diagnostics'];
    ast?: AlpcCompileResult['ast'];
    astText?: string;
  };
  live: boolean;
  ms?: number;
};

const RULE_RE = /^IF (\w+) (<=|>=|==|!=|<|>) (\d+) GOTO (\w+);/;

/** Compiles the demo program through the backend, falling back to a recorded real run. */
export function useDemoRun() {
  const [performance, setPerformance] = useState(RECORDED_PERFORMANCE);
  const [run, setRun] = useState<DemoRun>({
    performance: RECORDED_PERFORMANCE,
    source: DEMO_TEMPLATE(RECORDED_PERFORMANCE),
    result: RECORDED_RUN,
    live: false,
  });
  const [state, setState] = useState<'idle' | 'compiling' | 'offline'>('compiling');
  const reqId = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const id = ++reqId.current;
    const source = DEMO_TEMPLATE(performance);
    setState('compiling');
    const timer = setTimeout(async () => {
      const t0 = Date.now();
      try {
        const result = await api.compilePathLang(source);
        if (cancelled || id !== reqId.current) return;
        setRun({ performance, source, result, live: true, ms: Date.now() - t0 });
        setState('idle');
      } catch {
        if (cancelled || id !== reqId.current) return;
        setRun({ performance: RECORDED_PERFORMANCE, source: DEMO_TEMPLATE(RECORDED_PERFORMANCE), result: RECORDED_RUN, live: false });
        setPerformance(RECORDED_PERFORMANCE);
        setState('offline');
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [performance]);

  return { performance, setPerformance, run, state };
}

type Note = { text: string; tone?: 'mark' | 'faint'; span?: number };

export function MarkedListing({ run }: { run: DemoRun }) {
  const lines = useMemo(() => run.source.replace(/\n$/, '').split('\n'), [run.source]);
  const { result } = run;

  const notes = useMemo(() => {
    const n: Record<number, Note> = {};
    const outcomeLines = lines.map((l, i) => (l.startsWith('OUTCOME') ? i : -1)).filter(i => i >= 0);
    const ruleLines = lines.map((l, i) => (RULE_RE.test(l) ? i : -1)).filter(i => i >= 0);
    const perfLine = lines.findIndex(l => l.startsWith('SET performance'));

    if (!result.success) return n;

    if (outcomeLines.length) {
      n[outcomeLines[0]] = {
        text: 'declared before any rule uses them, so Backward Design passes',
        span: outcomeLines.length,
      };
    }
    if (perfLine >= 0) n[perfLine] = { text: 'the score from the student’s quiz' };

    const takenIdx = ruleLines.findIndex(i => RULE_RE.exec(lines[i])?.[4] === result.outcome);
    ruleLines.forEach((lineIdx, k) => {
      const m = RULE_RE.exec(lines[lineIdx]);
      if (!m) return;
      if (k === takenIdx) n[lineIdx] = { text: `first rule that holds: ${run.performance} ${m[2]} ${m[3]}` };
      else if (takenIdx >= 0 && k > takenIdx) n[lineIdx] = { text: 'never reached', tone: 'faint' };
      else n[lineIdx] = { text: `${run.performance} ${m[2]} ${m[3]} is false`, tone: 'faint' };
    });
    return n;
  }, [lines, result, run.performance]);

  const takenLine = useMemo(() => {
    if (!result.success) return -1;
    return lines.findIndex(l => RULE_RE.exec(l)?.[4] === result.outcome);
  }, [lines, result]);

  return (
    <figure className="m-0">
      <div className="listing">
        <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] py-3 sm:grid-cols-[2.25rem_minmax(0,1fr)_13rem]">
          {lines.map((line, i) => {
            const note = notes[i];
            // A line covered by a note spanning from an earlier line gets no margin cell of its own.
            const covered = Object.entries(notes).some(([k, nt]) => Number(k) < i && i < Number(k) + (nt.span || 1));
            return (
              <div key={i} className="contents">
                <span className="select-none pr-3 text-right t-faint" aria-hidden>{i + 1}</span>
                <code
                  className="whitespace-pre pr-3"
                  style={i === takenLine ? { textDecoration: 'underline wavy var(--mark)', textUnderlineOffset: '5px', textDecorationThickness: '1.5px' } : undefined}
                >
                  {line ? highlightPathLang(line) : ' '}
                </code>
                {!covered && (
                  <span
                    className={`hand col-start-2 pb-1 pl-0 pr-3 text-[1.05rem] sm:col-start-auto sm:pb-0 sm:pl-2 ${note ? '' : 'hidden sm:block'} ${note?.span ? 'sm:row-span-3 sm:self-center' : ''}`}
                    style={note?.tone === 'faint' ? { color: 'var(--faint)' } : undefined}
                  >
                    {note?.text}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="border-t border-[var(--rule)] px-4 py-3">
          {result.success ? (
            <p className="hand text-[1.3rem]">
              lli printed {result.alignmentScore}, the alignment score. Next step: the <span className="ident">{result.outcome}</span> path.
            </p>
          ) : (
            <div className="space-y-1">
              <p className="hand text-[1.3rem]">Compilation failed, so nothing was run.</p>
              {result.diagnostics?.map((d, i) => (
                <p key={i} className="text-[0.8125rem] t-mark">{d.message}</p>
              ))}
            </div>
          )}
        </div>
      </div>
      <figcaption className="mt-2 text-[0.8125rem] t-graphite">
        {run.live
          ? `Compiled by the ALPC backend just now${run.ms !== undefined ? ` in ${run.ms} ms` : ''}. The red notes are written from this run’s output.`
          : 'A recorded run of the real compiler. Start the backend to recompile this as you move the slider.'}
      </figcaption>
    </figure>
  );
}
