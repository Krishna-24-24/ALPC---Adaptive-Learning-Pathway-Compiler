'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AlpcAstNode } from '@/lib/api';

const NODE_PALETTE: [string, string][] = [
  ['Program',    'text-indigo-400'],
  ['Outcome',    'text-violet-400'],
  ['Assignment', 'text-blue-400'  ],
  ['Branch',     'text-amber-400' ],
  ['Condition',  'text-rose-400'  ],
];

function nodeColor(label: string): string {
  for (const [prefix, color] of NODE_PALETTE) {
    if (label.startsWith(prefix)) return color;
  }
  return 'text-white/60';
}

function TreeNode({ node, depth = 0 }: { node: AlpcAstNode; depth?: number }) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <button
        onClick={() => hasChildren && setOpen(o => !o)}
        className={[
          'flex items-center gap-1.5 py-0.5 w-full text-left rounded px-1',
          hasChildren ? 'cursor-pointer hover:bg-white/[0.03]' : 'cursor-default',
        ].join(' ')}
        style={{ paddingLeft: `${depth * 14}px` }}
      >
        {hasChildren ? (
          <span className="text-white/25 w-4 flex-shrink-0 flex items-center">
            {open
              ? <ChevronDown  className="h-3 w-3" />
              : <ChevronRight className="h-3 w-3" />
            }
          </span>
        ) : (
          <span className="w-4 flex-shrink-0 text-white/20 text-[10px] flex items-center">└</span>
        )}
        <span className={`text-xs font-mono ${nodeColor(node.label)}`}>{node.label}</span>
      </button>

      <AnimatePresence initial={false}>
        {open && hasChildren && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.12 }}
          >
            {node.children.map((child, i) => (
              <TreeNode key={i} node={child} depth={depth + 1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AstTree({ ast }: { ast: AlpcAstNode | null }) {
  if (!ast) {
    return (
      <p className="text-center text-white/30 text-sm py-10">
        No AST yet — compile a Path-Lang program to see the RTTI tree.
      </p>
    );
  }

  return (
    <div className="overflow-auto max-h-96 rounded-lg border border-white/[0.06] p-3 bg-black/20">
      <TreeNode node={ast} />
    </div>
  );
}
