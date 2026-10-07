'use client';

import Link from 'next/link';
import { MarkedListing, useDemoRun, type DemoRun } from '@/components/landing/MarkedListing';

/** One line per AST node kind with its count, read from the compiler's --dump-ast output. */
function astSummary(run: DemoRun) {
  const labels = run.result.ast
    ? run.result.ast.children.map(c => c.label)
    : (run.result.astText || '').split('\n').slice(1).map(l => l.trim()).filter(Boolean);
  const counts = new Map<string, number>();
  for (const l of labels) {
    const kind = l.split(/\s+/)[0];
    counts.set(kind, (counts.get(kind) || 0) + 1);
  }
  return [...counts].map(([k, n]) => `${n} ${k}`).join('\n') || 'no AST';
}

function stageExcerpts(run: DemoRun) {
  const { result } = run;
  const ir = result.irSource || '';
  const irLines = ir.split('\n').filter(l => /icmp|br i1/.test(l)).slice(2, 4).map(l => l.trim());
  const firstTokens = (result.tokens || []).slice(0, 3).map(t => `${t.type} "${t.lexeme}"`);
  const branches = (result.traceLines || []).filter(l => l.startsWith('branch'));
  return [
    {
      stage: 'Lexer',
      tool: 'Flex',
      does: 'Splits the program into tokens and rejects any character Path-Lang does not use.',
      out: `${(result.tokens || []).filter(t => t.type !== 'EOF').length} tokens, starting\n${firstTokens.join('\n')}`,
    },
    {
      stage: 'Parser',
      tool: 'Bison, LALR(1)',
      does: 'Checks the grammar and records each reduction. A missing semicolon stops here with its line and column.',
      out: branches.join('\n'),
    },
    {
      stage: 'Semantic check',
      tool: 'semantics.cpp',
      does: 'Every GOTO target must be declared above it (Backward Design). Variables must be set before a rule reads them.',
      out: result.success ? 'no diagnostics' : (result.diagnostics || []).map(d => d.message).join('\n'),
    },
    {
      stage: 'AST',
      tool: 'LLVM-style RTTI',
      does: 'Builds one node per statement. Codegen dispatches on node kind with isa and dyn_cast, without C++ RTTI.',
      out: astSummary(run),
    },
    {
      stage: 'LLVM IR',
      tool: 'codegen.cpp',
      does: 'Each rule becomes a compare and a conditional branch to the outcome’s basic block. The IR is verified before it runs.',
      out: irLines.join('\n'),
    },
    {
      stage: 'Execution',
      tool: 'lli',
      does: 'Runs the IR. The program prints the alignment score; the branch it took is the student’s next step.',
      out: result.success ? `printed ${result.alignmentScore}, took outcome.${result.outcome}` : 'not run',
    },
  ];
}

const REFERENCE = [
  { form: 'OUTCOME name;', meaning: 'Declares a learning outcome. It must come before any rule that jumps to it.' },
  { form: 'OUTCOME name += n;', meaning: 'Same, and adds n to the alignment score when the student lands there.' },
  { form: 'SET var = n;', meaning: 'Sets a student attribute such as performance or mastery. state holds the alignment score.' },
  { form: 'SET var += n;   SET var -= n;', meaning: 'Adjusts a variable that was already set.' },
  { form: 'IF var < n GOTO name;', meaning: 'Jumps to an outcome. Rules run top to bottom and the first one that holds wins. Operators: < > == != <= >=' },
  { form: '; b', meaning: 'Ending any statement with ; b makes the program print the score in binary.' },
  { form: '# text', meaning: 'A comment, ignored by the lexer.' },
];

export default function LandingPage() {
  const { performance, setPerformance, run, state } = useDemoRun();
  const stages = stageExcerpts(run);

  return (
    <div className="mx-auto max-w-[70rem] px-4 sm:px-6">
      {/* Hero */}
      <section className="grid gap-10 pb-16 pt-12 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)] lg:gap-14 lg:pt-20">
        <div>
          <h1 className="text-[2.25rem] leading-[1.1] sm:text-[2.75rem]">
            A compiler that decides what a student learns next.
          </h1>
          <p className="mt-5 text-[1.0625rem] t-graphite">
            Teachers write adaptive rules in Path-Lang, a small language built for this project. ALPC lexes, parses,
            checks and compiles each rule set to LLVM IR, then runs it against a student’s quiz results. Every step of
            the decision is kept, so you can see why a student was sent where they were.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/compiler" className="btn btn-primary">Open the playground</Link>
            <Link href="/register" className="btn btn-outline">Create an account</Link>
          </div>

          <div className="mt-10 max-w-[22rem]">
            <label htmlFor="demo-perf" className="label">
              Student performance: <span className="t-num">{performance}</span>
            </label>
            <input
              id="demo-perf"
              type="range"
              min={0}
              max={100}
              value={performance}
              disabled={state === 'offline'}
              onChange={e => setPerformance(Number(e.target.value))}
            />
            <p className="hint mt-1" aria-live="polite">
              {state === 'compiling' && 'Compiling…'}
              {state === 'idle' && 'Moving it changes line 6, then recompiles and reruns the program.'}
              {state === 'offline' && 'The backend is not running, so the slider is off.'}
            </p>
          </div>
        </div>

        <MarkedListing run={run} />
      </section>

      {/* Pipeline */}
      <section id="how-it-works" className="section-rule scroll-mt-6 py-14">
        <h2 className="text-[1.625rem]">What happens when a program is compiled</h2>
        <p className="mt-3 prose-measure t-graphite">
          The six stages below ran on the program above. The right-hand column is their real output, and it changes
          when you move the slider.
        </p>
        <ol className="mt-8 border-t border-[var(--rule)]">
          {stages.map((s, i) => (
            <li key={s.stage} className="grid gap-x-8 gap-y-2 border-b border-[var(--rule)] py-5 md:grid-cols-[12rem_minmax(0,1fr)_minmax(0,1fr)]">
              <div>
                <p className="font-semibold"><span className="t-faint t-num">{i + 1}.</span> {s.stage}</p>
                <p className="text-sm t-graphite">{s.tool}</p>
              </div>
              <p className="text-[0.9375rem]">{s.does}</p>
              <pre className="m-0 whitespace-pre-wrap break-words text-[0.8125rem] leading-relaxed t-graphite">{s.out}</pre>
            </li>
          ))}
        </ol>
      </section>

      {/* Learning side */}
      <section className="section-rule py-14">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-[1.625rem]">Where the numbers come from</h2>
            <p className="mt-3 t-graphite">
              Students start with a 15-question diagnostic across nine data structures topics. Each answer updates a
              Bayesian Knowledge Tracing estimate of their mastery, and the next question’s difficulty is picked with a
              one-parameter IRT model.
            </p>
            <p className="mt-3 t-graphite">
              When a quiz ends, the backend writes those estimates into a Path-Lang program as SET statements and
              compiles it. The outcome the program reaches becomes the recommendation on the student’s dashboard,
              together with the trace that produced it.
            </p>
          </div>
          <div>
            <h2 className="text-[1.625rem]">Errors are caught before anything runs</h2>
            <p className="mt-3 t-graphite">
              A rule that jumps to an outcome declared further down is a Backward Design violation, so the program is
              rejected with the exact position:
            </p>
            <div className="listing listing-wrap mt-4">
              <pre>
                <span className="t-faint">{'3  '}</span>{'IF performance < 70 GOTO remedial;\n'}
                <span className="t-faint">{'4  '}</span>{'OUTCOME remedial;\n\n'}
                <span className="t-mark">
                  {"line 3, col 26: Backward Design violation: 'remedial' is referenced before it is declared as an OUTCOME"}
                </span>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Reference */}
      <section id="path-lang" className="section-rule scroll-mt-6 py-14">
        <h2 className="text-[1.625rem]">Path-Lang in one table</h2>
        <p className="mt-3 prose-measure t-graphite">That is the whole language. The full grammar is in SPEC.md in the source.</p>
        <div className="mt-6 overflow-x-auto">
          <table className="table">
            <thead>
              <tr><th className="w-[16rem]">Statement</th><th>Meaning</th></tr>
            </thead>
            <tbody>
              {REFERENCE.map(r => (
                <tr key={r.form}>
                  <td className="whitespace-nowrap font-[family-name:var(--font-mono)] text-[0.8125rem]">{r.form}</td>
                  <td>{r.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/compiler" className="btn btn-primary">Write a pathway in the playground</Link>
          <Link href="/register" className="btn btn-outline">Take the diagnostic</Link>
        </div>
      </section>
    </div>
  );
}
