'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { AlpcDiagnostic } from '@/lib/api';
import { highlightPathLang } from '@/lib/pathlang';

interface Props {
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  minRows?: number;
  label?: string;
  /** Compiler diagnostics with 1-based line and column; drawn in red on the code. */
  diagnostics?: AlpcDiagnostic[];
}

const LINE = 22; // px; must match leading-[22px] on both layers

/** Strips the "line N, col C: " prefix the backend adds, for margin notes. */
function bare(message: string) {
  return message.replace(/^line \d+(, col \d+)?: /, '');
}

/** Length of the token starting at `from`, so the underline covers the whole offending word. */
function tokenLength(line: string, from: number) {
  const m = /^([A-Za-z_][A-Za-z0-9_]*|\d+|==|!=|<=|>=|\+=|-=|\S)/.exec(line.slice(from));
  return m ? m[0].length : 1;
}

/**
 * A textarea over a highlighted copy of its own text. The copy carries the
 * syntax colours and the red underlines; the textarea on top stays a normal,
 * accessible text field with a transparent ink so only the caret shows.
 */
export function PathLangEditor({ value, onChange, readOnly = false, minRows = 12, label = 'Path-Lang source', diagnostics = [] }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const lines = value.split('\n');
  const rows = Math.max(lines.length, minRows);

  // line index -> diagnostics on that line (lines past the end go on the last line)
  const byLine = useMemo(() => {
    const map = new Map<number, AlpcDiagnostic[]>();
    for (const d of diagnostics) {
      if (!d.line || d.line < 1) continue;
      const idx = Math.min(d.line, lines.length) - 1;
      map.set(idx, [...(map.get(idx) || []), d]);
    }
    return map;
  }, [diagnostics, lines.length]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, minRows * LINE + 24)}px`;
  }, [value, minRows]);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Tab' || readOnly) return;
    e.preventDefault();
    const { selectionStart: a, selectionEnd: b } = e.currentTarget;
    onChange(value.slice(0, a) + '  ' + value.slice(b));
    requestAnimationFrame(() => {
      if (ref.current) ref.current.selectionStart = ref.current.selectionEnd = a + 2;
    });
  }

  function renderLine(line: string, idx: number) {
    const diags = byLine.get(idx);
    if (!diags) return line ? highlightPathLang(line) : ' ';
    // Underline from the first diagnostic's column to the end of its token.
    const col = Math.max(1, Math.min(diags[0].col || 1, line.length + 1));
    const from = col - 1;
    const len = from >= line.length ? 1 : tokenLength(line, from);
    const before = line.slice(0, from);
    const bad = from >= line.length ? ' ' : line.slice(from, from + len);
    const after = line.slice(from + len);
    return (
      <>
        {before && highlightPathLang(before)}
        <span className="pl-error">{bad}</span>
        {after && highlightPathLang(after)}
      </>
    );
  }

  const textClasses = 'px-3 py-3 font-[family-name:var(--font-mono)] text-[0.8125rem] leading-[22px] whitespace-pre';

  return (
    <div>
      <div className="listing relative flex">
        <div aria-hidden className="select-none border-r border-[var(--rule-soft)] py-3 pl-2 pr-2 text-right">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className={`h-[22px] text-xs leading-[22px] t-num ${byLine.has(i) ? 't-mark font-semibold' : 't-faint'}`}>{i + 1}</div>
          ))}
        </div>

        <div className="relative min-w-0 flex-1 overflow-hidden">
          <pre aria-hidden className={`pointer-events-none absolute inset-0 m-0 ${textClasses}`} style={{ transform: `translateX(${-scrollLeft}px)` }}>
            {lines.map((line, i) => <div key={i} className="h-[22px]">{renderLine(line, i)}</div>)}
          </pre>
          <textarea
            ref={ref}
            aria-label={label}
            aria-invalid={diagnostics.length > 0 || undefined}
            aria-describedby={diagnostics.length ? 'editor-diagnostics' : undefined}
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onScroll={e => setScrollLeft(e.currentTarget.scrollLeft)}
            readOnly={readOnly}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            wrap="off"
            className={`relative block w-full resize-none overflow-x-auto overflow-y-hidden bg-transparent text-transparent caret-[var(--ink)] outline-none selection:bg-[var(--mark-wash)] selection:text-transparent focus-visible:outline-2 focus-visible:outline-[var(--focus)] ${textClasses}`}
            style={{ minHeight: `${minRows * LINE + 24}px` }}
          />
        </div>

        {byLine.size > 0 && (
          <div aria-hidden className="hidden w-[15rem] shrink-0 border-l border-[var(--rule-soft)] py-3 pl-3 pr-3 md:block">
            {Array.from({ length: rows }, (_, i) => {
              const diags = byLine.get(i);
              return (
                <div key={i} className="relative h-[22px]">
                  {diags && (
                    <p className="hand absolute left-0 right-0 top-0 text-[1.05rem]">
                      {diags.map(d => bare(d.message)).join('; ')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {diagnostics.length > 0 && (
        <ul id="editor-diagnostics" className="mt-2 space-y-1 text-[0.8125rem] md:sr-only">
          {diagnostics.map((d, i) => (
            <li key={i} className="t-mark font-[family-name:var(--font-mono)]">{d.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
