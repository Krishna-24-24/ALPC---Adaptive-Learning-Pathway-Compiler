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

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    api.getAdaptiveQuiz()
      .then(data => setQuestions(data.questions))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSubmit(answers: { questionId: string; selectedOption: number }[]) {
    const result: AdaptiveResult = await api.submitAdaptive(answers);
    sessionStorage.setItem('learnsmart_quiz_result', JSON.stringify(result));
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
      title="Practice quiz"
      subtitle="Ten questions, picked for the topics you are weakest in"
      onSubmit={handleSubmit}
      loading={loading}
    />
  );
}
