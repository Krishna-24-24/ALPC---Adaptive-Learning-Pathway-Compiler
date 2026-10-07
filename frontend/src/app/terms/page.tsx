import type { Metadata } from 'next';
import Link from 'next/link';
import { DocPage } from '@/components/layout/DocPage';

export const metadata: Metadata = { title: 'Terms: ALPC' };

export default function TermsPage() {
  return (
    <DocPage title="Terms of use" updated="7 October 2026">
      <p>
        ALPC is a course project for Compiler Design. You can use it to practise data structures questions and to
        write and compile Path-Lang programs. By creating an account you agree to the points below.
      </p>

      <h2>What the recommendations are</h2>
      <p>
        Study recommendations are produced automatically from your quiz answers and a Path-Lang program. They are a
        demonstration of the compiler, not academic advice, and they can be wrong. Your teacher’s guidance comes first.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>Use your own email address and keep your password to yourself.</li>
        <li>Do not put sensitive personal information in your name or in programs you save.</li>
        <li>Accounts may be removed when the project’s database is reset, for example at the end of a semester.</li>
      </ul>

      <h2>The compiler</h2>
      <ul>
        <li>Only Path-Lang is accepted. Programs are limited to 32 KB and each run is stopped after 10 seconds.</li>
        <li>Do not try to break, overload or get around the limits of the server.</li>
      </ul>

      <h2>No warranty</h2>
      <p>
        The app is provided as it is, with no guarantee that it is available, correct or that your data is kept. Do
        not rely on it for anything that matters beyond learning.
      </p>

      <h2>Your data</h2>
      <p>
        What is stored and how to remove it is described on the <Link href="/privacy" className="link">privacy page</Link>.
      </p>
    </DocPage>
  );
}
