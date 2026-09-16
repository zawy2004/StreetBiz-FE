import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AuthShell } from '../components/AuthShell';
import { Button } from '@/components/common';
import { PhoneField } from '@/components/forms';
import { toLocalPhone } from '@/core/utils/phone';
import { useMockDb } from '@/mocks/db';

export function ResetPasswordRequestScreen() {
  const navigate = useNavigate();
  const users = useMockDb((s) => s.users);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string>();

  const submit = () => {
    const normalized = toLocalPhone(phone);
    if (!users.some((u) => u.phone.replace(/\D/g, '') === normalized.replace(/\D/g, ''))) {
      setError('Không tìm thấy tài khoản với số điện thoại này.');
      return;
    }
    setError(undefined);
    navigate(
      `/auth/verify-phone?purpose=RESET&phone=${encodeURIComponent(normalized)}`,
    );
  };

  return (
    <AuthShell
      title="Quên mật khẩu"
      subtitle="Nhập số điện thoại đã đăng ký để nhận mã OTP đặt lại mật khẩu"
      back
    >
      <PhoneField value={phone} onChangeText={setPhone} error={error} />
      <Button label="Gửi mã OTP" onPress={submit} />
    </AuthShell>
  );
}
