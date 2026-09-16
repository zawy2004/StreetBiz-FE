import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { Button } from '@/components/common';

describe('Button', () => {
  it('renders its label and responds to press', () => {
    const onPress = vi.fn();
    render(<Button label="Đăng nhập" onPress={onPress} />);

    expect(screen.getByText('Đăng nhập')).toBeTruthy();
    fireEvent.click(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire onPress when disabled', () => {
    const onPress = vi.fn();
    render(<Button label="Gửi" onPress={onPress} disabled />);

    fireEvent.click(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
