import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createContext, type ReactNode } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppErrorBoundary } from '@/components/feedback/AppErrorBoundary';
import type { RoleCode } from '@/core/types/role';
import { useAuthStore } from '@/store/auth-store';

// The map library draws with WebGL, which jsdom has not got: stand-ins that render their children.
vi.mock('@goongmaps/goong-map-react', () => {
  const Pass = ({ children }: { children?: ReactNode }) => <div data-testid="map">{children}</div>;
  const Nothing = () => null;
  return {
    default: Pass,
    InteractiveMap: Pass,
    StaticMap: Pass,
    Source: ({ children }: { children?: ReactNode }) => <>{children}</>,
    Layer: Nothing,
    Marker: ({ children }: { children?: ReactNode }) => <>{children}</>,
    Popup: ({ children }: { children?: ReactNode }) => <>{children}</>,
    NavigationControl: Nothing,
    GeolocateControl: Nothing,
    LinearInterpolator: class {},
    FlyToInterpolator: class {},
    _MapContext: createContext({}),
    MapContext: createContext({}),
  };
});

const { AppRouter } = await import('@/router');

/**
 * Every route of the app, read from router.tsx itself (so a route added later is swept too):
 * role groups are `<Route path="/vendor" ...>` with relative children; ":id" segments get 1.
 */
function routesFromRouter(): string[] {
  const source = readFileSync(path.resolve(import.meta.dirname, '../../src/router.tsx'), 'utf8');
  const routes: string[] = [];
  let parent = '';
  for (const match of source.matchAll(/path="([^"]+)"/g)) {
    const p = match[1]!;
    if (p === '*') continue;
    if (p.startsWith('/')) {
      parent = /^\/(vendor|ward|platform|customer)$/.test(p) ? p : '';
      if (!parent) routes.push(p);
      continue;
    }
    routes.push(`${parent}/${p}`);
  }
  return [
    ...new Set(
      routes.map((r) =>
        r.replace(/:[A-Za-z]+/g, (m) =>
          m === ':kind' ? 'proposals' : m === ':token' ? 'tok' : '1',
        ),
      ),
    ),
  ];
}

const USERS: Record<
  RoleCode,
  { id: string; fullName: string; phone: string; role_code: RoleCode; wardUnitId?: number }
> = {
  CUSTOMER: { id: '201', fullName: 'Khách', phone: '0905000201', role_code: 'CUSTOMER' },
  VENDOR: { id: '101', fullName: 'Phạm Thị Lan', phone: '0905000101', role_code: 'VENDOR' },
  WARD_AUTHORITY: {
    id: '1',
    fullName: 'Cán bộ',
    phone: '0983000001',
    role_code: 'WARD_AUTHORITY',
    wardUnitId: 1,
  },
  PLATFORM_ADMIN: {
    id: '9',
    fullName: 'Quản trị',
    phone: '0900000001',
    role_code: 'PLATFORM_ADMIN',
  },
};

/** Who opens a route: its role group, a signed-in buyer for the shared account pages, else a guest. */
function roleFor(route: string): RoleCode | null {
  if (route.startsWith('/vendor')) return 'VENDOR';
  if (route.startsWith('/ward')) return 'WARD_AUTHORITY';
  if (route.startsWith('/platform')) return 'PLATFORM_ADMIN';
  if (route.startsWith('/customer') || route.startsWith('/account') || route.startsWith('/orders'))
    return 'CUSTOMER';
  return null;
}

let landed = '';
function Where() {
  landed = useLocation().pathname;
  return null;
}

afterEach(() => {
  cleanup();
  useAuthStore.setState({ user: null, sessionExpired: false });
});

// /assistant is a deliberately empty page: the assistant panel is opened over it by App, not the router.
const ROUTES = routesFromRouter().filter((r) => r !== '/assistant');

describe('every route of the app', () => {
  it('reads the routes of all four roles from the router', () => {
    expect(ROUTES.length).toBeGreaterThan(100);
    for (const prefix of ['/vendor/', '/ward/', '/platform/', '/customer/', '/auth/', '/legal/']) {
      expect(ROUTES.some((r) => r.startsWith(prefix))).toBe(true);
    }
  });

  it.each(ROUTES)(
    '%s opens a screen for its role (no sign-in bounce, no 404, no crash)',
    async (route) => {
      const role = roleFor(route);
      useAuthStore.setState({
        user: role ? ({ ...USERS[role], password: '', account_status: 'ACTIVE' } as never) : null,
        sessionExpired: false,
      });

      render(
        <QueryClientProvider
          client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
        >
          <MemoryRouter initialEntries={[route]}>
            <AppErrorBoundary>
              <Where />
              <AppRouter />
            </AppErrorBoundary>
          </MemoryRouter>
        </QueryClientProvider>,
      );

      // The screen is a lazy chunk: wait until something other than the loading fallback is drawn.
      await waitFor(
        () => expect(document.body.textContent?.trim().length ?? 0).toBeGreaterThan(20),
        { timeout: 15_000 },
      );

      expect(screen.queryByText('Không tìm thấy trang.')).not.toBeInTheDocument();
      expect(screen.queryByText('Đã xảy ra lỗi')).not.toBeInTheDocument();
      if (role) expect(landed).not.toBe('/auth/sign-in');
    },
  );
});
