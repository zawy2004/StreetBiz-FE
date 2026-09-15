import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AuthShell } from '../components/AuthShell';
import { Button } from '@/components/common';
import { PasswordField } from '@/components/forms';
import { showToast } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';

export function ResetPasswordScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const users = useMockDb((s) => s.users);
  const updatePassword = useMockDb((s) => s.updateUserPassword);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string>();

  const submit = () => {
    if (password.length < 6) return setError('Mật khẩu cần tối thiểu 6 ký tự.');
    if (password !== confirm) return setError('Mật khẩu nhập lại không khớp.');
    const user = users.find((u) => u.phone.replace(/\D/g, '') === phone?.replace(/\D/g, ''));
    if (!user) return setError('Không tìm thấy tài khoản.');
    updatePassword(user.id, password);
    showToast('Đặt lại mật khẩu thành công');
    router.replace('/auth/sign-in');
  };

  return (
    <AuthShell title="Đặt mật khẩu mới" subtitle={`Cho tài khoản ${phone}`} back>
      <PasswordField
        label="Mật khẩu mới"
        value={password}
        onChangeText={setPassword}
        placeholder="Tối thiểu 6 ký tự"
      />
      <PasswordField
        label="Nhập lại mật khẩu"
        value={confirm}
        onChangeText={setConfirm}
        error={error}
      />
      <Button label="Xác nhận" onPress={submit} />
    </AuthShell>
  );
}
