import { cleanup, configure, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useToastStore } from '@/components/feedback';
import { RecordViolationScreen } from '@/features/ward-administration/screens/RecordViolationScreen';
import { useMockDb } from '@/mocks/db';

configure({ asyncUtilTimeout: 5_000 });

/** The patrol record in the demo (no server): both steps run on the mock database. */
function renderScreen(path = '/ward/patrol/violations/new') {
  return render(
    <MemoryRouter initialEntries={['/ward/patrol', path]} initialIndex={1}>
      <Routes>
        <Route path="/ward/patrol" element={<div>patrol home</div>} />
        <Route path="/ward/patrol/violations/new" element={<RecordViolationScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

const toast = () => useToastStore.getState().message;
const initialDb = useMockDb.getState();

describe('RecordViolationScreen (demo)', { timeout: 20_000 }, () => {
  beforeEach(() => {
    useMockDb.setState(initialDb, true);
    useToastStore.setState({ message: null });
  });
  afterEach(() => cleanup());

  it('records the violation, then issues the decision into the demo database', async () => {
    const before = useMockDb.getState().violations.length;
    const user = userEvent.setup();
    renderScreen();

    const [vendor] = await screen.findAllByRole('radio', { name: /\(0\d+\)/ });
    await user.click(vendor!);
    const [behaviour] = await screen.findAllByRole('radio', { name: /Sử dụng trái phép vỉa hè/ });
    await user.click(behaviour!);
    await user.type(screen.getByLabelText('Mô tả chi tiết vi phạm tại hiện trường'), 'Lấn vạch');
    await user.click(screen.getByRole('button', { name: 'Lập biên bản vi phạm (Bước 1)' }));

    expect(await screen.findByText(/Đã lập biên bản vi phạm #/)).toBeInTheDocument();
    expect(toast()).toBe('Đã lập biên bản vi phạm (Bước 1/2). Tiếp tục ra Quyết định xử phạt.');
    expect(screen.queryByRole('button', { name: 'Tải biên bản (.docx)' })).not.toBeInTheDocument();

    const number = screen.getByLabelText('Số Quyết định xử phạt hành chính *');
    expect((number as HTMLInputElement).value).toMatch(/^01\/QĐ-XPHC-\d{4}$/);
    await user.clear(number);
    expect(screen.getByRole('button', { name: 'Ban hành Quyết định (Bước 2)' })).toBeDisabled();

    await user.type(number, '02/QĐ-XPHC');
    await user.click(screen.getByRole('button', { name: 'Ban hành Quyết định (Bước 2)' }));
    expect(await screen.findByText('patrol home')).toBeInTheDocument();
    expect(toast()).toBe('Đã ban hành Quyết định xử phạt hành chính thành công');
    expect(useMockDb.getState().violations.length).toBe(before + 1);
  });

  it('can stop after step 1 and go back', async () => {
    const user = userEvent.setup();
    renderScreen();
    const [vendor] = await screen.findAllByRole('radio', { name: /\(0\d+\)/ });
    await user.click(vendor!);
    const [behaviour] = await screen.findAllByRole('radio', { name: /Sử dụng trái phép vỉa hè/ });
    await user.click(behaviour!);
    await user.type(screen.getByLabelText('Mô tả chi tiết vi phạm tại hiện trường'), 'Lấn vạch');
    await user.click(screen.getByRole('button', { name: 'Lập biên bản vi phạm (Bước 1)' }));
    await user.click(await screen.findByRole('button', { name: 'Xong bước 1, ra quyết định sau' }));
    expect(await screen.findByText('patrol home')).toBeInTheDocument();
  });
});
