export type StageId = 'tokens' | 'parse' | 'ast' | 'ir' | 'run';
export type StageStatus = 'success' | 'error' | 'skipped' | 'pending';

export const STAGE_META: Record<StageId, { label: string; description: string }> = {
  tokens: { label: 'Lexer',     description: 'Flex tokenization' },
  parse:  { label: 'Parser',    description: 'Bison LALR(1) parse + trace' },
  ast:    { label: 'AST',       description: 'LLVM-style RTTI tree' },
  ir:     { label: 'LLVM IR',   description: 'Code generation' },
  run:    { label: 'Execution', description: 'lli JIT execution' },
};

export const STAGE_ORDER: StageId[] = ['tokens', 'parse', 'ast', 'ir', 'run'];

export const OUTCOME_TIER_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  remedial: { bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    text: 'text-rose-300',    badge: 'bg-rose-500/20 text-rose-300 border border-rose-500/20'    },
  practice: { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-300',   badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/20'   },
  core:     { bg: 'bg-indigo-500/10',  border: 'border-indigo-500/20',  text: 'text-indigo-300',  badge: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/20'  },
  advanced: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-300', badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20' },
};

export function getOutcomeTier(outcome: string | null | undefined) {
  if (!outcome) return OUTCOME_TIER_COLORS.core;
  return OUTCOME_TIER_COLORS[outcome.toLowerCase()] || OUTCOME_TIER_COLORS.core;
}
