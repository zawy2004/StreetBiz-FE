import { useState } from 'react';

import { Button, Card } from '@/components/common';
import { PasswordField, PhoneField } from '@/components/forms';
import { communityApi, CommunityApiError, useCommunitySession } from '../community-api';

export function CommunityConnection() {
  const customer = useCommunitySession((state) => state.customer);
  const disconnect = useCommunitySession((state) => state.disconnect);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  if (customer) {
    return (
      <Card>
        <p className="text-body-md text-text">
          Đang gửi với tài khoản {customer.fullName || `#${customer.id}`}
        </p>
        <div className="mt-sm">
          <Button label="Đổi tài khoản" variant="ghost" fullWidth={false} onPress={disconnect} />
        </div>
      </Card>
    );
  }

  const connect = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await communityApi.login(phone, password);
    } catch (reason) {
      setError(reason instanceof CommunityApiError ? reason.message : 'Không thể đăng nhập.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <p className="mb-sm text-body-md text-muted">
        Đăng nhập tài khoản người mua để gửi đánh giá hoặc phản ánh.
      </p>
      <div className="flex flex-col gap-sm">
        <PhoneField value={phone} onChangeText={setPhone} />
        <PasswordField value={password} onChangeText={setPassword} error={error} />
        <Button
          label={busy ? 'Đang đăng nhập…' : 'Đăng nhập Backend'}
          onPress={connect}
          disabled={busy || !phone.trim() || !password}
        />
      </div>
    </Card>
  );
}
