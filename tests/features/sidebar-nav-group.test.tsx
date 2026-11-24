import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { RoleTabBar } from '@/components/layout/RoleTabBar';
import { WARD_TABS } from '@/layouts/role-tabs';

function mount(path: string) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <RoleTabBar roleLabel="Cán bộ Phường" items={WARD_TABS} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const current = () => screen.queryByRole('link', { current: 'page' });

beforeEach(() => {
  // jsdom has no matchMedia; report a desktop viewport so the sidebar renders.
  window.matchMedia = ((query: string) => ({
    matches: true,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});

afterEach(cleanup);

describe('Hộp duyệt group in the ward sidebar', () => {
  it('stays folded away while the officer is elsewhere and opens on click', () => {
    mount('/ward/dashboard');
    const group = screen.getByRole('button', { name: 'Hộp duyệt' });
    expect(group).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Hồ sơ vị trí')).not.toBeInTheDocument();

    fireEvent.click(group);
    expect(group).toHaveAttribute('aria-expanded', 'true');
    // The sub-list is the element the group button controls.
    const list = within(document.getElementById(group.getAttribute('aria-controls')!)!);
    expect(list.getByRole('link', { name: 'Tổng quan' })).toHaveAttribute('href', '/ward/inbox');
    expect(list.getByRole('link', { name: 'Hồ sơ vị trí' })).toHaveAttribute(
      'href',
      '/ward/inbox/reviews',
    );
    expect(list.getByRole('link', { name: 'Hồ sơ an toàn thực phẩm' })).toHaveAttribute(
      'href',
      '/ward/inbox/food-safety',
    );
  });

  it.each([
    ['/ward/inbox', 'Tổng quan'],
    ['/ward/inbox/registrations/12', 'Tổng quan'],
    ['/ward/inbox/reviews', 'Hồ sơ vị trí'],
    ['/ward/inbox/reviews/transfers/40', 'Hồ sơ vị trí'],
    ['/ward/inbox/slot-proposals/7', 'Hồ sơ vị trí'],
    ['/ward/inbox/food-safety/3', 'Hồ sơ an toàn thực phẩm'],
  ])('opens on %s and lights "%s"', (path, label) => {
    mount(path);
    expect(screen.getByRole('button', { name: 'Hộp duyệt' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(current()).toHaveTextContent(label);
  });

  it('can be folded shut while inside it', () => {
    mount('/ward/inbox/reviews');
    fireEvent.click(screen.getByRole('button', { name: 'Hộp duyệt' }));
    expect(screen.queryByText('Hồ sơ vị trí')).not.toBeInTheDocument();
  });
});

describe('ward sidebar by job', () => {
  it('heads each job with a section title, in order', () => {
    mount('/ward/dashboard');
    const nav = screen.getByRole('navigation', { name: 'Điều hướng chính' });
    const titles = [...nav.querySelectorAll('p')]
      .map((p) => p.textContent)
      .filter((t) => ['Hồ sơ', 'Hiện trường', 'Tài chính', 'Thiết lập'].includes(t ?? ''));
    expect(titles).toEqual(['Hồ sơ', 'Hiện trường', 'Tài chính', 'Thiết lập']);
  });

  it.each([
    ['/ward/finance/receipts', 'Thu phí', 'Lịch sử thu'],
    ['/ward/finance/12', 'Thu phí', 'Theo dõi thu phí'],
    ['/ward/slots/editor', 'Lưới ô', 'Vẽ & sửa lưới ô'],
    ['/ward/slots/7', 'Lưới ô', 'Bảng ô & lấp đầy'],
    ['/ward/patrol/violations/new', 'Tuần tra', 'Ghi nhận vi phạm'],
    ['/ward/settings/penalties', 'Quy định & mức thu', 'Mức phạt vi phạm'],
    ['/ward/reports/debtors', 'Báo cáo', 'Hộ còn nợ'],
    ['/ward/inbox/vendor-reports/4', 'Hộp duyệt', 'Phản ánh về hộ kinh doanh'],
  ])('on %s opens "%s" and lights its most specific page "%s"', (path, group, page) => {
    mount(path);
    expect(screen.getByRole('button', { name: group })).toHaveAttribute('aria-expanded', 'true');
    expect(current()).toHaveTextContent(page);
  });
});
