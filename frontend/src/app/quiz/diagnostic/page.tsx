'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import QuizUI from '@/components/QuizUI';
import { api, getToken, getUser, setUser, type QuizQuestion } from '@/lib/api';

export default function DiagnosticPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    api.getDiagnostic()
      .then(data => setQuestions(data.questions))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSubmit(answers: { questionId: string; selectedOption: number }[]) {
    await api.submitDiagnostic(answers);
    const user = getUser();
    if (user) setUser({ ...user, diagnosticCompleted: true });
    router.push('/dashboard');
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[44rem] px-4 py-16 sm:px-6">
        <h1 className="text-[1.75rem]">The diagnostic could not load</h1>
        <p className="mt-2 t-graphite">{error}</p>
      </div>
    );
  }

  return (
    <QuizUI
      questions={questions}
      title="Diagnostic"
      subtitle="Fifteen questions across nine topics to set your starting mastery"
      onSubmit={handleSubmit}
      loading={loading}
    />
  );
}
