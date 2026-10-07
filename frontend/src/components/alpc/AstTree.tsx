'use client';

import type { AlpcAstNode } from '@/lib/api';

const FIELD_RE = /(\w+)=("[^"]*"|\S+)/g;

/** Splits a --dump-ast line such as `CondBranch  line=10  var="performance"` into kind and fields. */
function parseLabel(label: string) {
  const kind = label.trim().split(/\s+/)[0];
  const fields: [string, string][] = [];
  let m: RegExpExecArray | null;
  FIELD_RE.lastIndex = 0;
  while ((m = FIELD_RE.exec(label)) !== null) fields.push([m[1], m[2].replace(/^"|"$/g, '')]);
  return { kind, fields };
}

export function AstTree({ ast }: { ast: AlpcAstNode | null }) {
  if (!ast) {
    return <p className="py-8 text-sm t-graphite">Compile a program to see the syntax tree the parser built.</p>;
  }

  const root = parseLabel(ast.label);
  const binary = root.fields.find(([k]) => k === 'binary_output')?.[1] === '1';

  return (
    <div>
      <p className="mb-3 text-sm">
        <span className="font-semibold">{root.kind}</span>
        <span className="t-graphite">, {ast.children.length} statements, binary output {binary ? 'on' : 'off'}</span>
      </p>
      <div className="max-h-[28rem] overflow-auto">
        <table className="table text-[0.8125rem]">
          <thead className="sticky top-0 bg-[var(--sheet)]">
            <tr><th className="w-28">Node</th><th className="w-14">Line</th><th>Fields</th></tr>
          </thead>
          <tbody>
            {ast.children.map((child, i) => {
              const { kind, fields } = parseLabel(child.label);
              const line = fields.find(([k]) => k === 'line')?.[1];
              return (
                <tr key={i}>
                  <td className="font-medium">{kind}</td>
                  <td className="t-faint t-num">{line}</td>
                  <td className="font-[family-name:var(--font-mono)]">
                    {fields.filter(([k]) => k !== 'line').map(([k, v]) => (
                      <span key={k} className="mr-4 whitespace-nowrap"><span className="t-graphite">{k}</span> {v}</span>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
