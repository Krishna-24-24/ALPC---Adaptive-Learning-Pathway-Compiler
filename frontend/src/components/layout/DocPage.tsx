export function DocPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-[70rem] px-4 pb-8 pt-12 sm:px-6">
      <div className="prose-measure">
        <h1 className="text-[2rem]">{title}</h1>
        <p className="mt-2 text-sm t-graphite">Last updated {updated}</p>
        <div className="doc mt-8 space-y-4 text-[0.9375rem] leading-relaxed [&_h2]:mt-10 [&_h2]:text-lg [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
      </div>
    </article>
  );
}
