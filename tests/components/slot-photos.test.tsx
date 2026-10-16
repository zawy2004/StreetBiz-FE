import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SlotCover } from '@/features/sidewalk-slots/components/SlotCover';
import { SlotDetailPanel } from '@/features/sidewalk-slots/components/SlotDetailPanel';
import { SlotPhotosField } from '@/features/ward-administration/components/ops/grid/SlotPhotosField';
import { wardConfigApi } from '@/features/ward-administration/ward-config-api';
import { makeSlot } from '../features/slot-fixtures';

const A = '/api/uploads/slot-images/5/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg';
const B = '/api/uploads/slot-images/5/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.png';
const C = '/api/uploads/slot-images/5/cccccccccccccccccccccccccccccccc.webp';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('SlotCover', () => {
  it('shows a single photo as a plain picture with no viewer', () => {
    render(<SlotCover urls={[A]} slotCode="NVL-04" />);

    expect(screen.getByRole('img', { name: 'Ô NVL-04' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('puts a +N badge on the cover when there are more photos and opens them all', async () => {
    const user = userEvent.setup();
    render(<SlotCover urls={[A, B, C]} slotCode="NVL-04" />);

    const open = screen.getByRole('button', { name: 'Xem 3 ảnh của ô NVL-04' });
    expect(open).toHaveTextContent('2');

    await user.click(open);
    const dialog = screen.getByRole('dialog', { name: 'Ảnh ô NVL-04' });
    expect(within(dialog).getByText('1/3')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Ảnh sau' }));
    expect(within(dialog).getByText('2/3')).toBeInTheDocument();
    await user.keyboard('{ArrowRight}');
    expect(within(dialog).getByText('3/3')).toBeInTheDocument();
    await user.keyboard('{ArrowRight}');
    expect(within(dialog).getByText('1/3')).toBeInTheDocument();
    await user.keyboard('{ArrowLeft}');
    expect(within(dialog).getByText('3/3')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('SlotDetailPanel photos', () => {
  const panel = (imageUrls: string[]) => {
    const slot = makeSlot({ slotId: 10, slotCode: 'NVL-04', latitude: 16.05, longitude: 108.22, imageUrls });
    return render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>
          <SlotDetailPanel slot={slot} zone={undefined} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  it('drops the bay drawing and the "no photo" line once the slot has a photo', () => {
    panel([A, B]);

    expect(screen.getByRole('button', { name: 'Xem 2 ảnh của ô NVL-04' })).toBeInTheDocument();
    expect(screen.queryByText('Chưa có ảnh')).not.toBeInTheDocument();
  });

  it('keeps the drawing and says so when the slot has no photo', () => {
    panel([]);

    expect(screen.getByText('Chưa có ảnh')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Xem \d+ ảnh/ })).not.toBeInTheDocument();
  });
});

describe('SlotPhotosField (ward)', () => {
  const file = (name: string, type: string, size = 1000) => {
    const f = new File(['x'], name, { type });
    Object.defineProperty(f, 'size', { value: size });
    return f;
  };

  it('marks the first photo as the cover and can move another one to the front', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SlotPhotosField value={[A, B]} onChange={onChange} />);

    expect(screen.getAllByText('Ảnh bìa')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Đặt làm bìa' }));
    expect(onChange).toHaveBeenCalledWith([B, A]);
  });

  it('removes one photo', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SlotPhotosField value={[A, B, C]} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Xóa ảnh 2' }));
    expect(onChange).toHaveBeenCalledWith([A, C]);
  });

  it('uploads each picked photo and appends the returned URLs', async () => {
    const upload = vi
      .spyOn(wardConfigApi, 'uploadSlotImage')
      .mockResolvedValueOnce({ fileUrl: B })
      .mockResolvedValueOnce({ fileUrl: C });
    const onChange = vi.fn();
    render(<SlotPhotosField value={[A]} onChange={onChange} />);

    fireEvent.change(screen.getByTestId('slot-photo-input'), {
      target: { files: [file('1.jpg', 'image/jpeg'), file('2.png', 'image/png')] },
    });

    await waitFor(() => expect(onChange).toHaveBeenCalledWith([A, B, C]));
    expect(upload).toHaveBeenCalledTimes(2);
  });

  it('refuses other file types and oversized photos without uploading them', async () => {
    const upload = vi.spyOn(wardConfigApi, 'uploadSlotImage');
    const onChange = vi.fn();
    render(<SlotPhotosField value={[]} onChange={onChange} />);

    fireEvent.change(screen.getByTestId('slot-photo-input'), {
      target: { files: [file('a.pdf', 'application/pdf'), file('big.jpg', 'image/jpeg', 6 * 1024 * 1024)] },
    });

    await waitFor(() => expect(upload).not.toHaveBeenCalled());
    expect(onChange).not.toHaveBeenCalled();
  });

  it('stops offering more once there are six', () => {
    const six = ['a', 'b', 'c', 'd', 'e', 'f'].map((c) => `/api/uploads/slot-images/5/${c.repeat(32)}.jpg`);
    render(<SlotPhotosField value={six} onChange={() => undefined} />);

    expect(screen.queryByRole('button', { name: 'Thêm ảnh' })).not.toBeInTheDocument();
    expect(screen.getByText(/6\/6 ảnh/)).toBeInTheDocument();
  });
});
