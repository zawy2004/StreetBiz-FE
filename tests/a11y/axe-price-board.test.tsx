import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const community = vi.hoisted(() => ({ verifyPermit: vi.fn() }));

vi.mock('@/features/vendor-map/community-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/vendor-map/community-api')>();
  return { ...actual, communityApi: { ...actual.communityApi, ...community } };
});

const { PublicPermitScreen } = await import('@/features/price-board/screens/PublicPermitScreen');
const { VendorReportResolvePanel } =
  await import('@/features/ward-administration/components/review/VendorReportDecision');

/** As in axe-ward-screens: jsdom has no layout, so contrast is left to the browser audit. */
async function violations(container: HTMLElement) {
  const result = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  });
  return result.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
}

afterEach(() => cleanup());

describe('axe-core: price board and report closing', () => {
  it('the public /q page with a valid permit and its board', async () => {
    community.verifyPermit.mockResolvedValue({
      isValid: true,
      status: 'VALID',
      permitId: 12,
      vendorId: 8,
      displayName: 'Bánh mì Cô Lan',
      slotId: 5,
      slotCode: 'NVL-022',
      latitude: null,
      longitude: null,
      validFrom: '2026-01-01',
      validUntil: '2026-12-31',
      priceBoard: {
        version: 4,
        updatedAt: '2026-10-22T01:15:00Z',
        printedVersionIsCurrent: false,
        items: [
          {
            menuItemId: 31,
            name: 'Bánh mì thịt',
            nameEn: 'Pork banh mi',
            priceUnit: 'ổ',
            unitPrice: 25000,
          },
        ],
      },
    });
    const { container } = render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/q/SBP1.a.b?v=2']}>
          <Routes>
            <Route path="/q/:token" element={<PublicPermitScreen />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await screen.findByRole('list', { name: 'Các món và giá' });
    expect(await violations(container)).toEqual([]);
  });

  it('the resolve panel with its refund field and a conflict message', async () => {
    const { container } = render(
      <VendorReportResolvePanel
        chargedAmount={70000}
        suggestedViolation="Bán cao hơn giá niêm yết"
        submitting={false}
        error={{
          message: 'Phản ánh đã được xử lý. Tải lại để xem kết quả mới nhất.',
          conflict: true,
        }}
        onResolve={vi.fn()}
        onRecordViolation={vi.fn()}
        onReload={vi.fn()}
      />,
    );

    expect(await violations(container)).toEqual([]);
  });
});
