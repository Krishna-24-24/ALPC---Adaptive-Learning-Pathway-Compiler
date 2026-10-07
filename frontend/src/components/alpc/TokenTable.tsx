'use client';

import type { AlpcToken } from '@/lib/api';

// Token names exactly as `alpc --dump-tokens` prints them.
const KEYWORDS = new Set(['OUTCOME', 'SET', 'IF', 'GOTO']);
const OPERATORS = new Set(['LT', 'GT', 'EQ', 'NE', 'LE', 'GE', 'ASSIGN', 'ADD_ASSIGN', 'SUB_ASSIGN']);

function typeClass(type: string) {
  if (KEYWORDS.has(type)) return 'syn-kw';
  if (type === 'NUMBER') return 'syn-num';
  if (OPERATORS.has(type)) return 'syn-op';
  if (type === 'SEMI_B') return 'syn-num';
  if (type === 'SEMI' || type === 'EOF') return 't-faint';
  return '';
}

export function TokenTable({ tokens }: { tokens: AlpcToken[] }) {
  if (!tokens.length) {
    return <p className="py-8 text-sm t-graphite">Compile a program to see the tokens Flex produced.</p>;
  }

  return (
    <div className="max-h-[28rem] overflow-auto">
      <table className="table font-[family-name:var(--font-mono)] text-[0.8125rem]">
        <thead className="sticky top-0 bg-[var(--sheet)]">
          <tr><th className="w-14">Line</th><th>Token</th><th>Lexeme</th></tr>
        </thead>
        <tbody>
          {tokens.map((t, i) => (
            <tr key={i}>
              <td className="t-faint t-num">{t.line ?? ''}</td>
              <td className={typeClass(t.type)}>{t.type}</td>
              <td>{t.lexeme || <span className="t-faint">end of input</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
