/**
 * Reads the @main function of the IR that ALPC generates: its basic blocks,
 * the edges between them, and which blocks a run actually visits.
 *
 * The path is found by interpreting the IR, not by re-reading the Path-Lang
 * rules: only the instructions ALPC emits are understood (alloca, load, store,
 * add, sub, icmp, phi, call, br, switch, ret). Anything else makes trace()
 * return null, and the graph is drawn without a path.
 */

export interface IrBlock {
  name: string;
  instructions: string[];
  /** Blocks this one can jump to, in the order its terminator lists them. */
  successors: string[];
}

export interface IrFunction {
  blocks: IrBlock[];
  instructionCount: number;
}

const VALUE = /^-?\d+$/;

/** The blocks of @main, or null if the IR has no @main. */
export function parseMain(ir: string): IrFunction | null {
  const lines = ir.split('\n');
  const start = lines.findIndex(l => /^define\b.*@main\(/.test(l));
  if (start < 0) return null;

  const blocks: IrBlock[] = [];
  let cur: IrBlock | null = null;
  for (let i = start + 1; i < lines.length; i++) {
    const raw = lines[i];
    if (raw.startsWith('}')) break;
    const line = raw.replace(/;.*$/, '').trim();
    if (!line) continue;
    const label = /^([\w.$-]+):/.exec(line);
    if (label) {
      cur = { name: label[1], instructions: [], successors: [] };
      blocks.push(cur);
      continue;
    }
    if (!cur) {
      // Optimized IR may leave the first block unlabeled.
      cur = { name: 'entry', instructions: [], successors: [] };
      blocks.push(cur);
    }
    cur.instructions.push(line);
  }

  for (const b of blocks) {
    const term = b.instructions[b.instructions.length - 1] || '';
    if (/^(br|switch)\b/.test(term)) {
      b.successors = [...term.matchAll(/label %([\w.$-]+)/g)].map(m => m[1]);
    }
  }
  return { blocks, instructionCount: blocks.reduce((n, b) => n + b.instructions.length, 0) };
}

/** Block names in the order one run of @main visits them, or null if the IR uses something unknown. */
export function trace(fn: IrFunction): string[] | null {
  const byName = new Map(fn.blocks.map(b => [b.name, b]));
  const ssa = new Map<string, number>();
  const memory = new Map<string, number>();
  const read = (v: string): number | null => {
    const t = v.trim();
    if (VALUE.test(t)) return Number(t);
    return t.startsWith('%') && ssa.has(t) ? (ssa.get(t) as number) : null;
  };

  const path: string[] = [];
  let prev: string | null = null;
  let block = fn.blocks[0];
  for (let steps = 0; block && steps < 10_000; steps++) {
    path.push(block.name);
    let next: string | null = null;

    for (const ins of block.instructions) {
      let m: RegExpExecArray | null;
      if ((m = /^(%[\w.$-]+) = alloca i32/.exec(ins))) {
        memory.set(m[1], 0);
      } else if ((m = /^store i32 ([^,]+), ptr (%[\w.$-]+)/.exec(ins))) {
        const v = read(m[1]);
        if (v === null) return null;
        memory.set(m[2], v);
      } else if ((m = /^(%[\w.$-]+) = load i32, ptr (%[\w.$-]+)/.exec(ins))) {
        if (!memory.has(m[2])) return null;
        ssa.set(m[1], memory.get(m[2]) as number);
      } else if ((m = /^(%[\w.$-]+) = (add|sub)(?: nsw| nuw)* i32 ([^,]+), (.+)$/.exec(ins))) {
        const a = read(m[3]), b = read(m[4]);
        if (a === null || b === null) return null;
        ssa.set(m[1], m[2] === 'add' ? (a + b) | 0 : (a - b) | 0);
      } else if ((m = /^(%[\w.$-]+) = icmp (\w+) i32 ([^,]+), (.+)$/.exec(ins))) {
        const a = read(m[3]), b = read(m[4]);
        if (a === null || b === null) return null;
        const r = { eq: a === b, ne: a !== b, slt: a < b, sgt: a > b, sle: a <= b, sge: a >= b }[m[2]];
        if (r === undefined) return null;
        ssa.set(m[1], r ? 1 : 0);
      } else if ((m = /^(%[\w.$-]+) = phi i32 (.+)$/.exec(ins))) {
        const pick = [...m[2].matchAll(/\[\s*([^,\]]+),\s*%([\w.$-]+)\s*\]/g)].find(x => x[2] === prev);
        const v = pick ? read(pick[1]) : null;
        if (v === null) return null;
        ssa.set(m[1], v);
      } else if (/^(%[\w.$-]+ = )?(tail )?call\b/.test(ins)) {
        const assigned = /^(%[\w.$-]+) =/.exec(ins);
        if (assigned) ssa.set(assigned[1], 0);
      } else if ((m = /^br label %([\w.$-]+)/.exec(ins))) {
        next = m[1];
      } else if ((m = /^br i1 ([^,]+), label %([\w.$-]+), label %([\w.$-]+)/.exec(ins))) {
        const c = read(m[1]);
        if (c === null) return null;
        next = c ? m[2] : m[3];
      } else if ((m = /^switch i32 ([^,]+), label %([\w.$-]+) \[(.*)\]/.exec(ins))) {
        const v = read(m[1]);
        if (v === null) return null;
        const hit = [...m[3].matchAll(/i32 (-?\d+), label %([\w.$-]+)/g)].find(x => Number(x[1]) === v);
        next = hit ? hit[2] : m[2];
      } else if (/^ret\b/.test(ins)) {
        return path;
      } else {
        return null;
      }
    }

    if (!next || !byName.has(next)) return null;
    prev = block.name;
    block = byName.get(next) as IrBlock;
  }
  return null;
}
