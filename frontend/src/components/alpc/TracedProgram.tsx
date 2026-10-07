import { highlightPathLang } from '@/lib/pathlang';

const RULE_RE = /^\s*IF\s+\w+\s*(<=|>=|==|!=|<|>)\s*\d+\s+GOTO\s+(\w+)\s*;/;

/**
 * A Path-Lang program with the rule that decided the outcome underlined.
 * The outcome comes from the compiled program's own output; this only finds
 * the first rule whose GOTO names it, which is the rule the program took
 * because rules run top to bottom.
 */
export function TracedProgram({ source, outcome }: { source: string; outcome: string | null }) {
  const lines = source.replace(/\n$/, '').split('\n');
  const ruleIdx = lines.map((l, i) => (RULE_RE.test(l) ? i : -1)).filter(i => i >= 0);
  const taken = outcome ? ruleIdx.find(i => RULE_RE.exec(lines[i])?.[2] === outcome) ?? -1 : -1;

  return (
    <div className="listing">
      <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] py-3 sm:grid-cols-[2.25rem_minmax(0,1fr)_12rem]">
        {lines.map((line, i) => {
          const isRule = ruleIdx.includes(i);
          const note = i === taken ? 'taken: the first rule that held'
            : isRule && taken >= 0 && i > taken ? 'never reached'
            : isRule && taken >= 0 ? 'checked, did not hold'
            : isRule && taken < 0 ? 'did not hold' : '';
          return (
            <div key={i} className="contents">
              <span className="select-none pr-3 text-right t-faint t-num" aria-hidden>{i + 1}</span>
              <code className={`whitespace-pre pr-3 ${i === taken ? 'pl-error' : ''}`}>{line ? highlightPathLang(line) : ' '}</code>
              <span
                className={`hand col-start-2 pb-1 pr-3 text-[1.05rem] sm:col-start-auto sm:pb-0 sm:pl-2 ${note ? '' : 'hidden sm:block'}`}
                style={i !== taken ? { color: 'var(--faint)' } : undefined}
              >
                {note}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
