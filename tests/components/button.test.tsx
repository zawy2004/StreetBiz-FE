import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from '@/components/common';

describe('Button', () => {
  it('renders its label and responds to press', async () => {
    const onPress = jest.fn();
    await render(<Button label="Đăng nhập" onPress={onPress} />);

    expect(screen.getByText('Đăng nhập')).toBeTruthy();
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire onPress when disabled', async () => {
    const onPress = jest.fn();
    await render(<Button label="Gửi" onPress={onPress} disabled />);

    fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
