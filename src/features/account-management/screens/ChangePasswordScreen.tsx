import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/common';
import { PasswordField } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { showToast } from '@/components/feedback';
import { PasswordChecklist } from '@/features/authentication/components/PasswordChecklist';
import { ApiError, authApi, errorMessage } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { isPasswordValid, passwordError } from '@/core/auth/password-policy';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';

/** AUTH-07: change the password of the signed-in account. */
export function ChangePasswordScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const updatePassword = useMockDb((s) => s.updateUserPassword);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [currentMessage, setCurrentMessage] = useState<string>();
  const [nextMessage, setNextMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (submitting) return;

    if (!current) {
      setCurrentMessage('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (!isPasswordValid(next)) {
      setCurrentMessage(undefined);
      setNextMessage(passwordError(next));
      setError(undefined);
      return;
    }
    if (next === current) {
      // Both fields are already in hand, so this is worth checking client-side
      // rather than making the user wait for the same answer from the server.
      setCurrentMessage(undefined);
      setNextMessage('Mật khẩu mới phải khác mật khẩu hiện tại.');
      setError(undefined);
      return;
    }
    if (next !== confirm) {
      setCurrentMessage(undefined);
      setNextMessage(undefined);
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }

    setCurrentMessage(undefined);
    setNextMessage(undefined);
    setError(undefined);
    setSubmitting(true);
    try {
      if (isLiveApi) {
        await authApi.changePassword(current, next);
      } else {
        if (current !== user.password) throw new Error('Mật khẩu hiện tại không đúng.');
        updatePassword(user.id, next);
        setUser({ ...user, password: next });
      }
      showToast('Đổi mật khẩu thành công. Các thiết bị khác đã được đăng xuất.');
      navigate(-1);
    } catch (err) {
      if (err instanceof ApiError && err.isValidation) {
        setNextMessage(err.fieldError('NewPassword'));
        setCurrentMessage(err.fieldError('CurrentPassword'));
        if (!err.fieldError('NewPassword') && !err.fieldError('CurrentPassword')) {
          setError(err.message);
        }
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <AppHeader title="Đổi mật khẩu" back />
      <form className="flex flex-col gap-md" onSubmit={submit} noValidate>
        <PasswordField
          label="Mật khẩu hiện tại"
          value={current}
          onChangeText={setCurrent}
          error={currentMessage}
          autoComplete="current-password"
        />
        <PasswordField
          label="Mật khẩu mới"
          value={next}
          onChangeText={setNext}
          error={nextMessage}
          placeholder="Tối thiểu 8 ký tự"
          autoComplete="new-password"
        />
        <PasswordChecklist value={next} visible={next.length > 0} />
        <PasswordField
          label="Nhập lại mật khẩu mới"
          value={confirm}
          onChangeText={setConfirm}
          error={error}
        />
        <Button label="Lưu thay đổi" type="submit" loading={submitting} onPress={submit} />
      </form>
    </Screen>
  );
}
