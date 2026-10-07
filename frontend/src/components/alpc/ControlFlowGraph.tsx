'use client';

import { useMemo } from 'react';
import { parseMain, trace } from '@/lib/ir';

const BOX_W = 232;
const BOX_H = 34;
const GAP = 14;
const LANE = 13;
const TOP = 8;

interface Edge { from: number; to: number; taken: boolean }

/** Gives each long edge a lane to the right of the boxes so no two overlap. */
function assignLanes(edges: Edge[]): Map<Edge, number> {
  const lanes: Edge[][] = [];
  const out = new Map<Edge, number>();
  const span = (e: Edge) => [Math.min(e.from, e.to), Math.max(e.from, e.to)];
  for (const e of [...edges].sort((a, b) => Math.abs(a.to - a.from) - Math.abs(b.to - b.from))) {
    const [lo, hi] = span(e);
    let lane = lanes.findIndex(l => l.every(o => { const [a, b] = span(o); return hi < a || lo > b; }));
    if (lane < 0) { lane = lanes.length; lanes.push([]); }
    lanes[lane].push(e);
    out.set(e, lane);
  }
  return out;
}

/**
 * The basic blocks of @main as boxes in IR order, with every branch drawn.
 * Blocks and edges the run went through are drawn in red ink.
 */
export function ControlFlowGraph({ ir }: { ir: string }) {
  const graph = useMemo(() => {
    const fn = parseMain(ir);
    if (!fn || fn.blocks.length === 0) return null;
    const index = new Map(fn.blocks.map((b, i) => [b.name, i]));
    const path = trace(fn);
    const takenEdges = new Set<string>();
    if (path) for (let i = 1; i < path.length; i++) takenEdges.add(`${path[i - 1]}>${path[i]}`);
    const edges: Edge[] = [];
    fn.blocks.forEach((b, i) => {
      for (const s of new Set(b.successors)) {
        const j = index.get(s);
        if (j !== undefined) edges.push({ from: i, to: j, taken: takenEdges.has(`${b.name}>${s}`) });
      }
    });
    const lanes = assignLanes(edges.filter(e => e.to !== e.from + 1));
    return { fn, path: path ? new Set(path) : null, edges, lanes, laneCount: new Set(lanes.values()).size };
  }, [ir]);

  if (!graph) return <p className="py-8 text-sm t-graphite">There is no @main function to draw.</p>;

  const { fn, path, edges, lanes, laneCount } = graph;
  const y = (i: number) => TOP + i * (BOX_H + GAP);
  const width = BOX_W + 24 + laneCount * LANE + 8;
  const height = y(fn.blocks.length) + 4;
  const ink = (on: boolean) => (on ? 'var(--mark)' : 'var(--faint)');

  return (
    <figure className="space-y-3">
      <figcaption className="text-sm t-graphite">
        {fn.blocks.length} basic blocks in <code>@main</code>.{' '}
        {path
          ? <>The run went through the <span className="t-mark">{path.size} drawn in red</span>; the rest were skipped.</>
          : 'The path of the run could not be worked out from this IR.'}
      </figcaption>
      <div className="listing max-h-[32rem] overflow-auto p-3">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Control-flow graph with ${fn.blocks.length} blocks`}
          className="block font-[family-name:var(--font-mono)]"
        >
          <defs>
            {['on', 'off'].map(k => (
              <marker key={k} id={`cfg-arrow-${k}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L8,4 L0,8 z" fill={ink(k === 'on')} />
              </marker>
            ))}
          </defs>

          {edges.filter(e => !e.taken).concat(edges.filter(e => e.taken)).map((e, k) => {
            const marker = `url(#cfg-arrow-${e.taken ? 'on' : 'off'})`;
            const common = { fill: 'none', stroke: ink(e.taken), strokeWidth: e.taken ? 1.75 : 1, markerEnd: marker };
            if (e.to === e.from + 1) {
              const x = 20 + (e.taken ? 0 : 6);
              return <path key={k} d={`M${x},${y(e.from) + BOX_H} V${y(e.to) - 1}`} {...common} />;
            }
            const lx = BOX_W + 14 + (lanes.get(e) ?? 0) * LANE;
            const y1 = y(e.from) + BOX_H / 2 + 5;
            const y2 = y(e.to) + BOX_H / 2 - 5;
            return <path key={k} d={`M${BOX_W},${y1} H${lx} V${y2} H${BOX_W + 2}`} {...common} />;
          })}

          {fn.blocks.map((b, i) => {
            const on = path?.has(b.name) ?? false;
            return (
              <g key={b.name}>
                <rect x={0.5} y={y(i) + 0.5} width={BOX_W - 1} height={BOX_H - 1} rx={3}
                  fill="var(--sheet)" stroke={on ? 'var(--mark)' : 'var(--rule)'} strokeWidth={on ? 1.5 : 1} />
                <text x={10} y={y(i) + 15} fontSize={12} fill="var(--ink)" fontWeight={on ? 600 : 400}>
                  {b.name.length > 26 ? b.name.slice(0, 25) + '…' : b.name}
                </text>
                <text x={10} y={y(i) + 28} fontSize={10.5} fill="var(--graphite)">
                  {b.instructions.length} instruction{b.instructions.length === 1 ? '' : 's'}
                  {b.successors.length > 1 ? ` · ${b.successors.length}-way branch` : ''}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </figure>
  );
}
