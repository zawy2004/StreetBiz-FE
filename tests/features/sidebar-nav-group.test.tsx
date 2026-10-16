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
    expect(list.getByRole('link', { name: 'Hồ sơ vị trí' })).toHaveAttribute('href', '/ward/inbox/reviews');
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
    expect(screen.getByRole('button', { name: 'Hộp duyệt' })).toHaveAttribute('aria-expanded', 'true');
    expect(current()).toHaveTextContent(label);
  });

  it('can be folded shut while inside it', () => {
    mount('/ward/inbox/reviews');
    fireEvent.click(screen.getByRole('button', { name: 'Hộp duyệt' }));
    expect(screen.queryByText('Hồ sơ vị trí')).not.toBeInTheDocument();
  });
});
