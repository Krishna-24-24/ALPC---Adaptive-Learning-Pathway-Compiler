import type { AlpcCompileResult } from '@/lib/api';

export type StageId = 'tokens' | 'parse' | 'ast' | 'ir' | 'run';

export const STAGE_META: Record<StageId, { label: string; tool: string }> = {
  tokens: { label: 'Lexer', tool: 'Flex' },
  parse: { label: 'Parser and semantic check', tool: 'Bison, semantics.cpp' },
  ast: { label: 'AST', tool: 'LLVM-style RTTI' },
  ir: { label: 'LLVM IR', tool: 'codegen.cpp' },
  run: { label: 'Execution', tool: 'lli' },
};

export const STAGE_ORDER: StageId[] = ['tokens', 'parse', 'ast', 'ir', 'run'];

/** Pass, fail, or not evaluated, read from the compiler's own diagnostics. */
export function backwardDesignStatus(result: Pick<AlpcCompileResult, 'diagnostics' | 'stages' | 'backwardDesign'> | null): 'pass' | 'fail' | 'unknown' {
  if (!result) return 'unknown';
  if (result.backwardDesign === true) return 'pass';
  if (result.backwardDesign === false) return 'fail';
  const all = [...(result.diagnostics || []).map(d => d.message), ...(result.stages || []).map(st => st.stderr || '')].join('\n');
  if (/Backward Design violation/.test(all)) return 'fail';
  const parse = result.stages?.find(s => s.id === 'parse');
  return parse?.status === 'success' ? 'pass' : 'unknown';
}
