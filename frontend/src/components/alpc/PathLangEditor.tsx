'use client';

import { useRef, useEffect } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  minRows?: number;
}

export function PathLangEditor({ value, onChange, readOnly = false, minRows = 12 }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineRows    = value.split('\n').length;
  const rows        = Math.max(lineRows, minRows);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, minRows * 21)}px`;
  }, [value, minRows]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const el    = e.currentTarget;
      const start = el.selectionStart;
      const end   = el.selectionEnd;
      const next  = value.slice(0, start) + '  ' + value.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + 2;
          textareaRef.current.selectionEnd   = start + 2;
        }
      });
    }
  };

  return (
    <div className="relative rounded-lg overflow-hidden border border-white/[0.08] bg-black/25">
      {/* Gutter */}
      <div className="absolute top-0 left-0 w-10 h-full bg-white/[0.015] border-r border-white/[0.05] pointer-events-none z-10" />
      {/* Line numbers */}
      <div className="absolute top-0 left-0 w-10 pt-4 pb-4 pointer-events-none select-none z-10" aria-hidden>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="h-[21px] flex items-center justify-end pr-2 text-[10px] text-white/18 font-mono">
            {i + 1}
          </div>
        ))}
      </div>
      {/* Editor */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        readOnly={readOnly}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        className="w-full bg-transparent text-[13px] font-mono text-white/80 leading-[21px] py-4 pr-4 pl-14 resize-none outline-none placeholder:text-white/20 relative z-0"
        placeholder={`OUTCOME remedial;\nOUTCOME core;\nOUTCOME advanced;\n\nSET performance = 72;\nSET state = 0;\n\nIF performance < 50 GOTO remedial;\nIF performance < 80 GOTO core;\nIF performance >= 80 GOTO advanced;`}
        style={{ minHeight: `${minRows * 21 + 32}px` }}
      />
    </div>
  );
}
