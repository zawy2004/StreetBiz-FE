import { StrictMode } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AssistantVendorResults } from '@/features/assistant/AssistantVendorResults';
import type { AssistantAction, AssistantCard } from '@/features/assistant/types';

vi.mock('@/core/api/asset-url', () => ({ apiAssetUrl: (url: string) => url }));
const originalShow = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');
beforeEach(() => {
  // jsdom has no top layer; real focus/inert behavior also needs browser verification.
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
      this.querySelector<HTMLButtonElement>('button')?.focus();
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    },
  });
});
afterEach(() => {
  cleanup();
  if (originalShow) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShow);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, 'close', originalClose);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
});
const card = (id: number, dish = 'Bún chả'): AssistantCard => ({
  kind: 'status',
  title: `Quầy ${id}`,
  actionId: `public.food:${id}`,
  imageUrl: '/api/uploads/menu-images/1/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg',
  fields: [
    { label: 'Món niêm yết', value: dish },
    { label: 'Giá niêm yết', value: '35.000 VND' },
    { label: 'Địa chỉ', value: 'Đường thử nghiệm, Đà Nẵng' },
  ],
});
const action = (id: number): AssistantAction => ({
  id: `public.food:${id}`,
  label: 'Mở chi tiết',
  kind: 'NAVIGATE',
  route: `/customer/explore/stores/${id}`,
});

describe('buyer vendor quick preview', () => {
  it('opens a compact preview without navigating, closes and restores focus', async () => {
    const navigate = vi.fn();
    const user = userEvent.setup();
    render(
      <AssistantVendorResults cards={[card(1)]} actions={[action(1)]} onNavigate={navigate} />,
    );
    const trigger = screen.getByRole('button', { name: 'Xem nhanh Quầy 1' });
    expect(screen.getByText('35.000 VND')).toBeVisible();
    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Quầy 1' })).toBeVisible();
    expect(navigate).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Đóng xem nhanh quầy' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('navigates only when explicitly choosing the storefront page', async () => {
    const navigate = vi.fn();
    const user = userEvent.setup();
    render(
      <AssistantVendorResults cards={[card(1)]} actions={[action(1)]} onNavigate={navigate} />,
    );
    await user.click(screen.getByRole('button', { name: 'Xem nhanh Quầy 1' }));
    await user.click(screen.getByRole('button', { name: 'Mở trang quầy' }));
    expect(navigate).toHaveBeenCalledWith('/customer/explore/stores/1');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('deduplicates quầy, initially limits to three and expands on request', async () => {
    const cards = [
      card(1),
      { ...card(1, 'Bún chả đặc biệt'), actionId: 'extra' },
      card(2),
      card(3),
      card(4),
    ];
    render(
      <AssistantVendorResults
        cards={cards}
        actions={[action(1), action(2), action(3), action(4), { ...action(1), id: 'extra' }]}
        onNavigate={vi.fn()}
      />,
    );
    expect(screen.getAllByRole('button', { name: /Xem nhanh Quầy/ })).toHaveLength(3);
    expect(screen.getByText('4 kết quả')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Xem thêm 1 quầy' }));
    expect(screen.getAllByRole('button', { name: /Xem nhanh Quầy/ })).toHaveLength(4);
  });

  it('does not expose unsafe routes or external image URLs', () => {
    render(
      <AssistantVendorResults
        cards={[{ ...card(1), imageUrl: 'https://untrusted.example/image.jpg' }, card(2)]}
        actions={[action(1), { ...action(2), route: '/platform/accounts' }]}
        onNavigate={vi.fn()}
      />,
    );
    expect(screen.getByRole('img')).toHaveAttribute('src', '/images/food/bun-cha.jpg');
    expect(screen.getByText('Ảnh minh họa')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Xem nhanh Quầy 2' })).not.toBeInTheDocument();
  });

  it('cancel closes preview without propagating Escape to the chatbot', async () => {
    const parentKey = vi.fn();
    const user = userEvent.setup();
    render(
      <div onKeyDown={parentKey}>
        <AssistantVendorResults cards={[card(1)]} actions={[action(1)]} onNavigate={vi.fn()} />
      </div>,
    );
    await user.click(screen.getByRole('button', { name: 'Xem nhanh Quầy 1' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(parentKey).not.toHaveBeenCalled();
    fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xem nhanh Quầy 1' })).toHaveFocus();
  });

  it('shows a clearly labelled local illustration in the tile and preview when the vendor has no photo', async () => {
    const vendor = { ...card(1), title: 'Bánh mì & Xôi Cô Lan', imageUrl: null };
    render(<AssistantVendorResults cards={[vendor]} actions={[action(1)]} onNavigate={vi.fn()} />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/images/food/banh-mi.jpg');
    expect(screen.getByRole('img')).toHaveAccessibleName(/Ảnh minh họa.*không phải ảnh thực tế/);
    expect(screen.getByText('Ảnh minh họa')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Xem nhanh Bánh mì & Xôi Cô Lan' }));
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByRole('img')).toHaveAttribute('src', '/images/food/banh-mi.jpg');
    expect(dialog.getByText('Ảnh minh họa')).toBeVisible();
    expect(dialog.queryByText('Ảnh niêm yết')).not.toBeInTheDocument();
  });

  it('prefers the uploaded photo, falls back on load error, and stops after the illustration fails', () => {
    render(<AssistantVendorResults cards={[card(1)]} actions={[action(1)]} onNavigate={vi.fn()} />);
    expect(screen.getByRole('img')).toHaveAttribute('src', card(1).imageUrl);
    expect(screen.queryByText('Ảnh minh họa')).not.toBeInTheDocument();
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByRole('img')).toHaveAttribute('src', '/images/food/bun-cha.jpg');
    expect(screen.getByText('Ảnh minh họa')).toBeVisible();
    fireEvent.error(screen.getByRole('img'));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Chưa có ảnh')).toBeVisible();
  });

  it('focuses the close button and restores the keyboard trigger in StrictMode', async () => {
    const user = userEvent.setup();
    render(
      <StrictMode>
        <AssistantVendorResults cards={[card(1)]} actions={[action(1)]} onNavigate={vi.fn()} />
      </StrictMode>,
    );
    const trigger = screen.getByRole('button', { name: 'Xem nhanh Quầy 1' });
    trigger.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Đóng xem nhanh quầy' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
