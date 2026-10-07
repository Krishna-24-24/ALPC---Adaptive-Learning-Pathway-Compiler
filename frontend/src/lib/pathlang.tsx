import type { ReactNode } from 'react';

const KEYWORDS = new Set(['OUTCOME', 'SET', 'IF', 'GOTO', 'AND', 'OR']);
// Same token boundaries as scanner.l: comments, numbers, words, two-char operators first.
const TOKEN_RE = /(#.*$)|(\d+)|([A-Za-z_][A-Za-z0-9_]*)|(==|!=|<=|>=|\+=|-=|<|>|=|\(|\))|(;\s*b\b|;)|(\s+)|(.)/g;

/** Highlights one line of Path-Lang for display. Keywords bold, numbers in red, the rest in ink. */
export function highlightPathLang(line: string): ReactNode[] {
  const out: ReactNode[] = [];
  let m: RegExpExecArray | null;
  let i = 0;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(line)) !== null) {
    const [text, comment, num, word, op] = m;
    let cls = '';
    if (comment) cls = 'syn-comment';
    else if (num) cls = 'syn-num';
    else if (word) cls = KEYWORDS.has(word) ? 'syn-kw' : 'syn-ident';
    else if (op) cls = 'syn-op';
    out.push(cls ? <span key={i++} className={cls}>{text}</span> : <span key={i++}>{text}</span>);
    if (m[0] === '') TOKEN_RE.lastIndex++;
  }
  return out;
}
