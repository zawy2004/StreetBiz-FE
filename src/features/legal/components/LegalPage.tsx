import { Link } from 'react-router-dom';

import { BrandLogo, Icon } from '@/components/common';
import { LandingFooter } from '@/features/landing/components/LandingFooter';
import { LEGAL_PAGES, type LegalBlock, type LegalDocument } from '../legal-content';
import { readingMinutes } from '../reading-time';

const NOTE_STYLE = {
  info: {
    box: 'bg-tint-primary text-text',
    icon: 'information-outline',
    title: 'text-primary',
  },
  warn: {
    box: 'bg-tint-error text-text',
    icon: 'alert-circle-outline',
    title: 'text-error',
  },
} as const;

function Block({ block }: { block: LegalBlock }) {
  switch (block.kind) {
    case 'p':
      return <p className="text-body-md leading-relaxed text-text">{block.text}</p>;
    case 'list':
      return (
        <ul className="flex list-disc flex-col gap-xs pl-md text-body-md leading-relaxed text-text marker:text-primary">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case 'steps':
      return (
        <ol className="flex flex-col gap-sm">
          {block.items.map((item, i) => (
            <li key={item} className="flex items-start gap-sm">
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-body-sm font-bold text-white"
              >
                {i + 1}
              </span>
              <span className="text-body-md leading-relaxed text-text">{item}</span>
            </li>
          ))}
        </ol>
      );
    case 'table':
      return (
        <div
          role="region"
          tabIndex={0}
          aria-label="Bảng, cuộn ngang nếu cần"
          className="overflow-x-auto rounded-[14px] ring-1 ring-border focus-visible:outline-2 focus-visible:outline-primary"
        >
          <table className="w-full min-w-[520px] border-collapse text-left text-body-md">
            <thead className="bg-tint-primary text-label text-text">
              <tr>
                {block.head.map((h) => (
                  <th key={h} scope="col" className="px-sm py-xs font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row[0]} className="border-t border-border align-top">
                  {row.map((cell, i) =>
                    i === 0 ? (
                      <th key={cell} scope="row" className="px-sm py-xs font-semibold text-text">
                        {cell}
                      </th>
                    ) : (
                      <td key={cell} className="px-sm py-xs leading-relaxed text-text">
                        {cell}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'note': {
      const style = NOTE_STYLE[block.tone];
      return (
        <aside
          aria-label={block.title}
          className={`flex items-start gap-sm rounded-[14px] p-sm ${style.box}`}
        >
          <Icon
            name={style.icon}
            size={20}
            color="currentColor"
            className={`mt-0.5 shrink-0 ${style.title}`}
          />
          <div className="flex flex-col gap-2xs">
            <p className={`text-body-md font-semibold ${style.title}`}>{block.title}</p>
            <p className="text-body-md leading-relaxed text-text">{block.text}</p>
          </div>
        </aside>
      );
    }
  }
}

/**
 * One public layout for every legal page: header, title with date and reading time, a "quick summary" of
 * the points that matter, a contents list, numbered sections (paragraphs, lists, steps, tables and notes),
 * links to the other legal pages and the footer.
 */
export function LegalPage({ doc }: { doc: LegalDocument }) {
  const minutes = readingMinutes(doc);
  const others = LEGAL_PAGES.filter((page) => page.title !== doc.title);

  return (
    <div data-surface="CUSTOMER" className="min-h-full bg-bg">
      <header className="border-b border-border bg-card print:hidden">
        <div className="mx-auto flex h-[60px] max-w-[820px] items-center justify-between gap-md px-md">
          <Link to="/" className="flex items-center gap-xs rounded-[12px]">
            <BrandLogo size={26} />
            <span className="font-sign text-[19px] font-bold text-text">StreetBiz</span>
          </Link>
          <Link
            to="/"
            className="flex min-h-11 items-center text-label font-semibold text-primary hover:underline"
          >
            Về trang chủ
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-[820px] flex-col gap-lg px-md py-lg">
        <div className="flex flex-col gap-xs">
          <p className="flex items-center gap-xs text-label font-semibold uppercase tracking-wide text-primary">
            <Icon name="gavel" size={14} color="currentColor" />
            Pháp lý
          </p>
          <h1 className="font-heading text-[30px] font-bold leading-tight text-text">
            {doc.title}
          </h1>
          <p className="text-body-lg text-muted">{doc.summary}</p>
          <p className="flex flex-wrap items-center gap-x-md gap-y-1 text-body-sm text-muted">
            <span>Cập nhật ngày {doc.updatedAt}</span>
            <span aria-hidden="true">·</span>
            <span>Đọc khoảng {minutes} phút</span>
          </p>
        </div>

        <section
          aria-labelledby="legal-highlights"
          className="rounded-[16px] bg-tint-tertiary p-md ring-1 ring-border"
        >
          <h2 id="legal-highlights" className="mb-xs text-headline-sm text-text">
            Tóm tắt nhanh
          </h2>
          <ul className="flex flex-col gap-xs">
            {doc.highlights.map((point) => (
              <li
                key={point}
                className="flex items-start gap-xs text-body-md leading-relaxed text-text"
              >
                <Icon
                  name="check-circle"
                  size={18}
                  color="currentColor"
                  className="mt-0.5 shrink-0 text-tertiary"
                />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>

        <nav
          aria-label="Mục lục"
          className="rounded-[16px] bg-card p-md ring-1 ring-border print:hidden"
        >
          <p className="mb-xs text-label font-semibold text-muted">Nội dung</p>
          <ol className="grid list-decimal gap-x-lg gap-y-1 pl-md text-body-md sm:grid-cols-2">
            {doc.sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="inline-flex min-h-9 items-center text-primary hover:underline"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {doc.sections.map((s, i) => (
          <section
            key={s.id}
            id={s.id}
            aria-labelledby={`${s.id}-title`}
            className="scroll-mt-md rounded-[16px] bg-card p-md ring-1 ring-border md:p-lg"
          >
            <h2
              id={`${s.id}-title`}
              className="mb-sm flex items-start gap-sm text-headline-sm text-text"
            >
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tint-primary text-body-md font-bold text-primary"
              >
                {i + 1}
              </span>
              <span>{s.title}</span>
            </h2>
            <div className="flex flex-col gap-sm">
              {s.blocks.map((block, j) => (
                <Block key={`${s.id}-${j}`} block={block} />
              ))}
            </div>
          </section>
        ))}

        <nav
          aria-label="Xem thêm"
          className="rounded-[16px] bg-card p-md ring-1 ring-border print:hidden"
        >
          <p className="mb-xs text-label font-semibold text-muted">Xem thêm</p>
          <ul className="flex flex-col gap-1">
            {others.map((page) => (
              <li key={page.to}>
                <Link
                  to={page.to}
                  className="inline-flex min-h-11 items-center gap-xs text-body-md font-semibold text-primary hover:underline"
                >
                  <Icon name="file-document-outline" size={18} color="currentColor" />
                  {page.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <a
          href="#top"
          onClick={(event) => {
            event.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="inline-flex min-h-11 items-center gap-xs self-start text-label font-semibold text-muted hover:text-text print:hidden"
        >
          <Icon name="arrow-up" size={16} color="currentColor" />
          Lên đầu trang
        </a>
      </main>

      <LandingFooter />
    </div>
  );
}
