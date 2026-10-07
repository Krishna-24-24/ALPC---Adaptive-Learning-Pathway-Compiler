'use client';

import { useEffect, useRef } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  minRows?: number;
  label?: string;
}

const LINE = 22; // px, matches leading-[22px]

/** A plain textarea with line numbers. Tab inserts two spaces. */
export function PathLangEditor({ value, onChange, readOnly = false, minRows = 12, label = 'Path-Lang source' }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const rows = Math.max(value.split('\n').length, minRows);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, minRows * LINE + 24)}px`;
  }, [value, minRows]);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Tab' || readOnly) return;
    e.preventDefault();
    const el = e.currentTarget;
    const { selectionStart: a, selectionEnd: b } = el;
    onChange(value.slice(0, a) + '  ' + value.slice(b));
    requestAnimationFrame(() => {
      if (ref.current) ref.current.selectionStart = ref.current.selectionEnd = a + 2;
    });
  }

  return (
    <div className="listing relative flex">
      <div aria-hidden className="select-none border-r border-[var(--rule-soft)] py-3 pl-2 pr-2 text-right t-faint">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="h-[22px] text-xs leading-[22px] t-num">{i + 1}</div>
        ))}
      </div>
      <textarea
        ref={ref}
        aria-label={label}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        readOnly={readOnly}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        wrap="off"
        className="block min-w-0 flex-1 resize-none overflow-x-auto bg-transparent px-3 py-3 font-[family-name:var(--font-mono)] text-[0.8125rem] leading-[22px] text-[var(--ink)] outline-none focus-visible:outline-2 focus-visible:outline-[var(--focus)]"
        style={{ minHeight: `${minRows * LINE + 24}px` }}
      />
    </div>
  );
}
