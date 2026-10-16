import { Link } from 'react-router-dom';

import { BrandLogo } from '@/components/common';
import { LandingFooter } from '@/features/landing/components/LandingFooter';
import type { LegalDocument } from '../legal-content';

/** One public layout for every legal page: header, contents list, numbered sections, footer. */
export function LegalPage({ doc }: { doc: LegalDocument }) {
  return (
    <div data-surface="CUSTOMER" className="min-h-full bg-bg">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-[60px] max-w-[760px] items-center justify-between gap-md px-md">
          <Link to="/" className="flex items-center gap-xs rounded-[12px]">
            <BrandLogo size={26} />
            <span className="font-sign text-[19px] font-bold text-text">StreetBiz</span>
          </Link>
          <Link to="/" className="text-label font-semibold text-primary hover:underline">
            Về trang chủ
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-[760px] flex-col gap-lg px-md py-lg">
        <div className="flex flex-col gap-xs">
          <h1 className="font-heading text-[28px] font-bold leading-tight text-text">{doc.title}</h1>
          <p className="text-body-md text-muted">{doc.summary}</p>
          <p className="text-body-sm text-muted">Cập nhật ngày {doc.updatedAt}</p>
        </div>

        <nav aria-label="Mục lục" className="rounded-[16px] bg-card p-md ring-1 ring-border">
          <ol className="flex list-decimal flex-col gap-1 pl-md text-body-md">
            {doc.sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-primary hover:underline">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {doc.sections.map((s, i) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="scroll-mt-md">
            <h2 id={`${s.id}-title`} className="mb-xs text-headline-sm text-text">
              {i + 1}. {s.title}
            </h2>
            <ul className="flex list-disc flex-col gap-1 pl-md text-body-md text-text">
              {s.paragraphs.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </section>
        ))}
      </main>

      <LandingFooter />
    </div>
  );
}
