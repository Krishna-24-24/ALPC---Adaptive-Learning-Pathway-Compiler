'use client';

import type { AlpcToken } from '@/lib/api';

const TOKEN_COLORS: Record<string, string> = {
  TOKEN_OUTCOME: 'text-violet-400',
  TOKEN_SET:     'text-blue-400',
  TOKEN_IF:      'text-amber-400',
  TOKEN_GOTO:    'text-amber-400',
  IDENTIFIER:    'text-emerald-400',
  NUMBER:        'text-orange-400',
  LESS_THAN:     'text-rose-400',
  GREATER_THAN:  'text-rose-400',
  EQ_EQ:         'text-rose-400',
  ASSIGN:        'text-cyan-400',
  ADD_ASSIGN:    'text-cyan-400',
  SUB_ASSIGN:    'text-cyan-400',
  SEMI:          'text-white/35',
  SEMI_B:        'text-purple-400',
  EOF:           'text-white/20',
};

export function TokenTable({ tokens }: { tokens: AlpcToken[] }) {
  if (!tokens.length) {
    return (
      <p className="text-center text-white/30 text-sm py-10">
        No tokens yet — compile a Path-Lang program to see Flex output.
      </p>
    );
  }

  return (
    <div className="overflow-auto max-h-96 rounded-lg border border-white/[0.06]">
      <table className="w-full text-xs font-mono border-collapse">
        <thead>
          <tr className="sticky top-0 bg-[var(--bg-elevated)] border-b border-white/[0.08]">
            <th className="text-left px-3 py-2 text-white/35 font-medium w-12 tabular-nums">Line</th>
            <th className="text-left px-3 py-2 text-white/35 font-medium">Token Type</th>
            <th className="text-left px-3 py-2 text-white/35 font-medium">Lexeme</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((tok, i) => (
            <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
              <td className="px-3 py-1.5 text-white/25 tabular-nums">{tok.line ?? '—'}</td>
              <td className={`px-3 py-1.5 font-semibold ${TOKEN_COLORS[tok.type] || 'text-white/55'}`}>
                {tok.type}
              </td>
              <td className="px-3 py-1.5 text-white/65">
                {tok.lexeme || <span className="text-white/20 italic">ε</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
