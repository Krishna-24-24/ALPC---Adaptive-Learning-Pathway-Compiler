'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import QuizUI from '@/components/QuizUI';
import { api, getToken, type AdaptiveResult, type QuizQuestion } from '@/lib/api';

export default function AdaptiveQuizPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // ?skill=Trees gives a five-question quiz on that topic only (from a study page).
  const [topic, setTopic] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    const skill = new URLSearchParams(window.location.search).get('skill');
    setTopic(skill);
    api.getAdaptiveQuiz(skill || undefined)
      .then(data => setQuestions(data.questions))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSubmit(answers: { questionId: string; selectedOption: number }[]) {
    const result: AdaptiveResult = await api.submitAdaptive(answers);
    sessionStorage.setItem('learnsmart_quiz_result', JSON.stringify({ ...result, topic }));
    router.push('/quiz/results');
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[44rem] px-4 py-16 sm:px-6">
        <h1 className="text-[1.75rem]">The quiz could not load</h1>
        <p className="mt-2 t-graphite">{error}</p>
      </div>
    );
  }

  return (
    <QuizUI
      questions={questions}
      title={topic ? `${topic} quiz` : 'Practice quiz'}
      subtitle={topic
        ? `${questions.length || 5} questions on ${topic}, at a difficulty matched to your mastery`
        : 'Ten questions, picked for the topics you are weakest in'}
      onSubmit={handleSubmit}
      loading={loading}
    />
  );
}
