import { useState } from 'react';

import { Avatar, Button, Icon } from '@/components/common';
import { PasswordField, PhoneField } from '@/components/forms';
import { communityApi, CommunityApiError, useCommunitySession } from '../community-api';

/** The ticket's notched sides: two half-circles bitten out at mid-height. */
const TICKET_MASK =
  'radial-gradient(circle at 0 50%, transparent 11px, #000 11.5px) left / 51% 100% no-repeat, radial-gradient(circle at 100% 50%, transparent 11px, #000 11.5px) right / 51% 100% no-repeat';

/**
 * Which buyer account a review or report is sent with, drawn as a small ticket
 * (painted kerb on top, notched sides). Signed in: one line with the name and
 * "Đổi tài khoản". Not yet: the buyer signs in right here; the session lives
 * in this tab only (`streetbiz-community-api` in sessionStorage), apart from the
 * app's own sign-in. Shared by the review (C06) and report (C07) forms.
 */
export function CommunityConnection() {
  const customer = useCommunitySession((state) => state.customer);
  const disconnect = useCommunitySession((state) => state.disconnect);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

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

  const name = customer ? customer.fullName || `#${customer.id}` : '';

  return (
    <div
      style={{ mask: TICKET_MASK, WebkitMask: TICKET_MASK }}
      className="overflow-hidden rounded-[20px] bg-[#FFF3E8] ring-1 ring-[#F5DCC6] dark:bg-card dark:ring-border"
    >
      <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
      {customer ? (
        <div className="flex flex-wrap items-center gap-sm px-lg py-md">
          <Avatar name={name} size={40} />
          <p className="flex min-w-0 flex-1 items-center gap-xs text-body-md text-text">
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-tertiary" />
            <span className="min-w-0">Đang gửi với tài khoản {name}</span>
          </p>
          <Button label="Đổi tài khoản" variant="ghost" fullWidth={false} onPress={disconnect} />
        </div>
      ) : (
        <div className="flex flex-col gap-md px-lg py-md">
          <p className="flex items-start gap-xs text-body-md font-medium text-text">
            <Icon
              name="account-circle-outline"
              size={20}
              color="currentColor"
              className="mt-0.5 shrink-0 text-primary"
            />
            Đăng nhập tài khoản người mua để gửi đánh giá hoặc phản ánh.
          </p>
          <div className="grid gap-sm md:grid-cols-2">
            <div className="cq min-w-0">
              <PhoneField value={phone} onChangeText={setPhone} />
            </div>
            <div className="cq min-w-0">
              <PasswordField value={password} onChangeText={setPassword} error={error} />
            </div>
          </div>
          <div className="flex flex-col gap-sm sm:flex-row sm:items-center">
            <div className="w-full sm:w-auto sm:shrink-0">
              <Button
                label={busy ? 'Đang đăng nhập…' : 'Đăng nhập Backend'}
                onPress={connect}
                disabled={busy || !phone.trim() || !password}
              />
            </div>
            <p className="text-body-sm text-text/70">
              Đánh giá và phản ánh gửi bằng tài khoản người mua. Phiên này chỉ lưu trong tab đang
              mở.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
