'use client';

import { useState } from 'react';

export function AuthLayout({ title, intro, children }: { title: string; intro: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[70rem] px-4 pb-8 pt-12 sm:px-6 sm:pt-16">
      <div className="max-w-[24rem]">
        <h1 className="text-[2rem]">{title}</h1>
        <p className="mt-2 text-[0.9375rem] t-graphite">{intro}</p>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

export function PasswordField({
  id, value, onChange, autoComplete, hint,
}: { id: string; value: string; onChange: (v: string) => void; autoComplete: string; hint?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="label">Password</label>
        <button type="button" className="btn btn-quiet btn-sm -mr-2 min-h-0" onClick={() => setShow(s => !s)} aria-controls={id}>
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      <input
        id={id}
        type={show ? 'text' : 'password'}
        required
        minLength={6}
        autoComplete={autoComplete}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="field"
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      {hint && <p id={`${id}-hint`} className="hint mt-1">{hint}</p>}
    </div>
  );
}
