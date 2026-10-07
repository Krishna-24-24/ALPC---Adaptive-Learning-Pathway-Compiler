'use client';

import { parseMain } from '@/lib/ir';

/** The IR after LLVM's opt -O2, with how much of @main it removed. */
export function OptimizedIr({ before, after, error }: { before: string; after?: string | null; error?: string | null }) {
  if (error) return <p className="notice notice-error">{error}</p>;
  if (!after) return <p className="py-8 text-sm t-graphite">The optimizer runs after a successful compile and run.</p>;

  const a = parseMain(before);
  const b = parseMain(after);
  // Drop module noise (attributes, metadata, comments) so @main is easy to find.
  const shown = after
    .split('\n')
    .filter(l => !/^(;|attributes #|!)/.test(l))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return (
    <div className="space-y-3">
      {a && b && (
        <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:max-w-md">
          <dt className="t-graphite">Blocks in @main</dt>
          <dd className="m-0 t-num">{a.blocks.length} → <span className="font-semibold">{b.blocks.length}</span></dd>
          <dt className="t-graphite">Instructions in @main</dt>
          <dd className="m-0 t-num">{a.instructionCount} → <span className="font-semibold">{b.instructionCount}</span></dd>
        </dl>
      )}
      <p className="prose-measure text-sm t-graphite">
        This is the same program after LLVM&rsquo;s <code>opt -O2</code>. Every SET is a constant, so constant
        propagation works out each comparison while compiling, the branches that can never run are deleted, and what
        is left prints the score and the outcome directly. The compiler&rsquo;s own IR is in the LLVM IR tab.
      </p>
      <div className="listing max-h-[24rem]"><pre>{shown}</pre></div>
    </div>
  );
}
