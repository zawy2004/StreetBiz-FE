import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AuthShell } from '../components/AuthShell';
import { Button } from '@/components/common';
import { PasswordField, PhoneField, SelectField, TextField } from '@/components/forms';
import { toLocalPhone } from '@/core/utils/phone';
import { useMockDb } from '@/mocks/db';

export function RegisterScreen() {
  const navigate = useNavigate();
  const users = useMockDb((s) => s.users);
  const [role, setRole] = useState<'CUSTOMER' | 'VENDOR'>('CUSTOMER');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();

  const submit = () => {
    if (!fullName.trim()) return setError('Vui lòng nhập họ tên.');
    if (phone.replace(/\D/g, '').length < 9) return setError('Số điện thoại chưa hợp lệ.');
    if (password.length < 6) return setError('Mật khẩu cần tối thiểu 6 ký tự.');
    const normalized = toLocalPhone(phone);
    if (users.some((u) => u.phone.replace(/\D/g, '') === normalized.replace(/\D/g, ''))) {
      return setError('Số điện thoại đã được đăng ký.');
    }
    setError(undefined);
    const params = new URLSearchParams({
      purpose: 'SIGNUP',
      phone: normalized,
      fullName,
      password,
      role,
    });
    navigate(`/auth/verify-phone?${params.toString()}`);
  };

  return (
    <AuthShell title="Tạo tài khoản StreetBiz" subtitle="Chọn vai trò để bắt đầu" back>
      <SelectField
        label="Bạn là"
        value={role}
        onChange={setRole}
        options={[
          {
            value: 'CUSTOMER',
            label: 'Người mua',
            description: 'Khám phá và ủng hộ hàng quán vỉa hè hợp pháp',
          },
          {
            value: 'VENDOR',
            label: 'Hộ kinh doanh',
            description: 'Đăng ký kinh doanh và thuê ô vỉa hè',
          },
        ]}
      />
      <TextField label="Họ và tên" value={fullName} onChangeText={setFullName} />
      <PhoneField value={phone} onChangeText={setPhone} />
      <PasswordField
        value={password}
        onChangeText={setPassword}
        error={error}
        placeholder="Tối thiểu 6 ký tự"
      />
      <Button label="Tiếp tục & Nhận OTP" onPress={submit} />
    </AuthShell>
  );
}
