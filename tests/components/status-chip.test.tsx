import { render, screen } from '@testing-library/react-native';

import { StatusChip } from '@/components/status';

describe('StatusChip', () => {
  it('maps a known backend status code to a Vietnamese label', async () => {
    await render(<StatusChip code="APPROVED" />);
    expect(screen.getByText('ĐÃ DUYỆT')).toBeTruthy();
  });

  it('falls back to the raw code for an unknown status', async () => {
    await render(<StatusChip code="SOMETHING_NEW" />);
    expect(screen.getByText('SOMETHING_NEW')).toBeTruthy();
  });

  it('renders an explicit label/tone pair', async () => {
    await render(<StatusChip label="Ưu tiên xét nhanh" tone="ok" />);
    expect(screen.getByText('ƯU TIÊN XÉT NHANH')).toBeTruthy();
  });
});
