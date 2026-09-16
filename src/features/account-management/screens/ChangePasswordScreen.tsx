import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/common';
import { PasswordField } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { showToast } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

export function ChangePasswordScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const updatePassword = useMockDb((s) => s.updateUserPassword);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string>();

  if (!user) return null;

  const submit = () => {
    if (current !== user.password) return setError('Mật khẩu hiện tại không đúng.');
    if (next.length < 6) return setError('Mật khẩu mới cần tối thiểu 6 ký tự.');
    if (next !== confirm) return setError('Mật khẩu nhập lại không khớp.');
    updatePassword(user.id, next);
    setUser({ ...user, password: next });
    showToast('Đổi mật khẩu thành công');
    navigate(-1);
  };

  return (
    <Screen>
      <AppHeader title="Đổi mật khẩu" back />
      <PasswordField label="Mật khẩu hiện tại" value={current} onChangeText={setCurrent} />
      <PasswordField
        label="Mật khẩu mới"
        value={next}
        onChangeText={setNext}
        placeholder="Tối thiểu 6 ký tự"
      />
      <PasswordField
        label="Nhập lại mật khẩu mới"
        value={confirm}
        onChangeText={setConfirm}
        error={error}
      />
      <Button label="Lưu thay đổi" onPress={submit} />
    </Screen>
  );
}
