'use client';

import { useCallback, useEffect, useState } from 'react';
import type { QuizQuestion } from '@/lib/api';

interface QuizUIProps {
  questions: QuizQuestion[];
  title: string;
  subtitle: string;
  onSubmit: (answers: { questionId: string; selectedOption: number }[]) => Promise<void>;
  loading?: boolean;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

function formatTime(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function QuizSkeleton({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mx-auto max-w-[44rem] px-4 py-8 sm:px-6" aria-label="Loading questions">
      <p className="text-sm t-graphite">{subtitle}</p>
      <h1 className="mt-1 text-[1.75rem]">{title}</h1>
      <div className="skel mt-8 h-1.5 w-full" />
      <div className="mt-8 space-y-3">
        <div className="skel h-4 w-40" />
        <div className="skel h-6 w-full" />
        <div className="skel h-6 w-3/4" />
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skel h-12 w-full" />)}
      </div>
    </div>
  );
}

export default function QuizUI({ questions, title, subtitle, onSubmit, loading }: QuizUIProps) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (loading || submitting) return;
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [loading, submitting]);

  const q = questions[current];
  const selected = q ? answers[q.id] : undefined;
  const answered = Object.keys(answers).length;
  const isLast = current === questions.length - 1;

  const submit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Only answered questions are sent. Each answer is the stored index of
      // the chosen option, because the server shuffles the order it shows.
      await onSubmit(questions
        .filter(question => answers[question.id] !== undefined)
        .map(question => {
          const shown = answers[question.id];
          return { questionId: question.id, selectedOption: question.optionIndex?.[shown] ?? shown };
        }));
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Your answers were not submitted.');
    } finally {
      setSubmitting(false);
    }
  }, [answers, onSubmit, questions]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!q || submitting) return;
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      const k = e.key.toLowerCase();
      const letter = 'abcde'.indexOf(k);
      const digit = '12345'.indexOf(k);
      const idx = letter >= 0 ? letter : digit;
      if (idx >= 0 && idx < q.options.length) setAnswers(a => ({ ...a, [q.id]: idx }));
      else if ((k === 'enter' || k === 'arrowright') && selected !== undefined) {
        if (!isLast) setCurrent(c => c + 1);
        else submit();
      } else if (k === 'arrowleft' && current > 0) setCurrent(c => c - 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [q, submitting, selected, isLast, current, submit]);

  if (loading || !q) return <QuizSkeleton title={title} subtitle={subtitle} />;

  return (
    <div className="mx-auto max-w-[44rem] px-4 py-8 sm:px-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm t-graphite">{subtitle}</p>
          <h1 className="mt-1 text-[1.75rem]">{title}</h1>
        </div>
        <p className="text-sm t-graphite t-num" aria-label={`Time spent ${formatTime(elapsed)}`}>{formatTime(elapsed)}</p>
      </header>

      <div className="mt-6">
        <p className="text-sm t-graphite">Question {current + 1} of {questions.length}. {answered} answered.</p>
        <nav aria-label="Questions" className="mt-2 flex flex-wrap gap-1">
          {questions.map((qn, i) => {
            const done = answers[qn.id] !== undefined;
            return (
              <button
                key={qn.id}
                type="button"
                onClick={() => setCurrent(i)}
                aria-current={i === current ? 'step' : undefined}
                aria-label={`Question ${i + 1}${done ? ', answered' : ''}`}
                className={`h-7 w-7 rounded-[3px] border text-xs t-num ${
                  i === current ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
                    : done ? 'border-[var(--ink)]' : 'border-[var(--rule)] t-graphite'
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </nav>
      </div>

      <section className="section-rule mt-6 pt-6" aria-labelledby="q-text">
        <p className="text-sm t-graphite">{q.skill}, {q.difficulty?.toLowerCase() || 'medium'} difficulty</p>
        <h2 id="q-text" className="mt-2 text-[1.1875rem] font-medium leading-snug">{q.text}</h2>

        <div role="radiogroup" aria-labelledby="q-text" className="mt-6 space-y-2">
          {q.options.map((option, idx) => {
            const isSel = selected === idx;
            return (
              <button
                key={idx}
                type="button"
                role="radio"
                aria-checked={isSel}
                onClick={() => setAnswers(a => ({ ...a, [q.id]: idx }))}
                className={`flex w-full items-start gap-4 rounded-[3px] border px-4 py-3 text-left text-[0.9375rem] ${
                  isSel ? 'border-[var(--ink)] bg-[var(--sheet)] outline outline-1 outline-[var(--ink)]' : 'border-[var(--rule)] hover:border-[var(--graphite)]'
                }`}
              >
                <span className={`font-[family-name:var(--font-mono)] text-sm ${isSel ? 'font-semibold' : 't-graphite'}`}>{LETTERS[idx]}</span>
                <span>{option}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs t-graphite">Keys A to D choose an answer. Enter moves to the next question.</p>
      </section>

      {submitError && <p className="notice notice-error mt-6" role="alert">{submitError}</p>}

      <div className="mt-8 flex items-center justify-between gap-3">
        <button type="button" className="btn btn-outline" disabled={current === 0} onClick={() => setCurrent(c => c - 1)}>
          Previous
        </button>
        {!isLast ? (
          <button type="button" className="btn btn-primary" disabled={selected === undefined} onClick={() => setCurrent(c => c + 1)}>
            Next question
          </button>
        ) : (
          <button type="button" className="btn btn-primary" disabled={selected === undefined || submitting} onClick={submit}>
            {submitting ? 'Submitting…' : `Submit ${answered} of ${questions.length} answers`}
          </button>
        )}
      </div>
    </div>
  );
}
