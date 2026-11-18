import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { LandingFooter } from '@/features/landing/components/LandingFooter';
import {
  LegalBasisScreen,
  PrivacyScreen,
  SlotRulesScreen,
  TermsScreen,
} from '@/features/legal/screens';
import { readingMinutes } from '@/features/legal/reading-time';
import {
  LEGAL_BASIS,
  PRIVACY,
  SLOT_COMMITMENTS,
  SLOT_RULES,
  TERMS,
  type LegalDocument,
} from '@/features/legal/legal-content';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/legal/terms" element={<TermsScreen />} />
        <Route path="/legal/privacy" element={<PrivacyScreen />} />
        <Route path="/legal/slot-rules" element={<SlotRulesScreen />} />
        <Route path="/legal/basis" element={<LegalBasisScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('legal pages', () => {
  it.each([
    ['/legal/terms', 'Điều khoản sử dụng'],
    ['/legal/privacy', 'Chính sách bảo mật'],
    ['/legal/slot-rules', 'Quy định thuê ô vỉa hè'],
    ['/legal/basis', 'Căn cứ pháp lý'],
  ])('%s renders its title and a contents list without signing in', (path, title) => {
    renderAt(path);
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Mục lục' })).toBeInTheDocument();
  });

  it('keeps both rental commitments on the slot rules page', () => {
    renderAt('/legal/slot-rules');
    for (const text of SLOT_COMMITMENTS) expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('links the legal pages from the landing footer', () => {
    render(
      <MemoryRouter>
        <LandingFooter />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Điều khoản' })).toHaveAttribute(
      'href',
      '/legal/terms',
    );
    expect(screen.getByRole('link', { name: 'Bảo mật' })).toHaveAttribute('href', '/legal/privacy');
    expect(screen.getByRole('link', { name: 'Quy định thuê ô' })).toHaveAttribute(
      'href',
      '/legal/slot-rules',
    );
    expect(screen.getByRole('link', { name: 'Căn cứ pháp lý' })).toHaveAttribute(
      'href',
      '/legal/basis',
    );
  });

  it('shows a quick summary, the reading time and every section of each page', () => {
    for (const [path, doc] of [
      ['/legal/terms', TERMS],
      ['/legal/privacy', PRIVACY],
      ['/legal/slot-rules', SLOT_RULES],
      ['/legal/basis', LEGAL_BASIS],
    ] as const) {
      const { unmount } = renderAt(path);
      const summary = screen.getByRole('region', { name: 'Tóm tắt nhanh' });
      expect(within(summary).getAllByRole('listitem')).toHaveLength(doc.highlights.length);
      expect(screen.getByText(`Đọc khoảng ${readingMinutes(doc)} phút`)).toBeInTheDocument();
      for (const section of doc.sections) {
        expect(document.getElementById(section.id)).not.toBeNull();
      }
      unmount();
    }
  });

  it('draws a table with column headers and keeps its rows readable', () => {
    renderAt('/legal/terms');
    const table = screen.getAllByRole('table')[0]!;
    expect(within(table).getAllByRole('columnheader').length).toBeGreaterThan(1);
    expect(within(table).getAllByRole('rowheader').length).toBeGreaterThan(0);
  });

  it('links the other three legal pages at the bottom and not the page itself', () => {
    renderAt('/legal/privacy');
    const more = screen.getByRole('navigation', { name: 'Xem thêm' });
    expect(
      within(more)
        .getAllByRole('link')
        .map((a) => a.getAttribute('href')),
    ).toEqual(['/legal/terms', '/legal/slot-rules', '/legal/basis']);
  });
});

/** The copy is data, so its shape is worth checking: a broken row or id would only show on screen. */
describe('legal content', () => {
  const docs: [string, LegalDocument][] = [
    ['terms', TERMS],
    ['privacy', PRIVACY],
    ['slot-rules', SLOT_RULES],
    ['basis', LEGAL_BASIS],
  ];

  it.each(docs)('%s has unique section ids and a dd/mm/yyyy update date', (_name, doc) => {
    const ids = doc.sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(doc.updatedAt).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(doc.highlights.length).toBeGreaterThan(0);
  });

  it.each(docs)('%s has tables whose rows all have as many cells as the header', (_name, doc) => {
    for (const section of doc.sections) {
      for (const block of section.blocks) {
        if (block.kind !== 'table') continue;
        for (const row of block.rows) expect(row).toHaveLength(block.head.length);
        // The first cell is the row's key.
        expect(new Set(block.rows.map((r) => r[0])).size).toBe(block.rows.length);
      }
    }
  });

  it('keeps the section ids other screens link to', () => {
    expect(SLOT_RULES.sections.map((s) => s.id)).toContain('bao-gia');
    expect(LEGAL_BASIS.sections.map((s) => s.id)).toEqual(
      expect.arrayContaining([
        'tuyen',
        'duyet-ho-so',
        'cap-phuong',
        'kinh-doanh',
        'du-lieu',
        'xu-phat',
      ]),
    );
  });

  it('never leaves a note to the authors in the public text', () => {
    const all = JSON.stringify([TERMS, PRIVACY, SLOT_RULES, LEGAL_BASIS]);
    expect(all).not.toMatch(/cần cập nhật|TODO|sẽ cập nhật|khi ban hành/i);
  });
});
