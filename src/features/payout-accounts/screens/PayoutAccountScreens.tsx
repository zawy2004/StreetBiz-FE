import { Icon } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { isLiveApi } from '@/core/config/env';
import { WardGate } from '@/features/ward-administration/components/WardGate';
import { PayoutAccountPanel } from '../PayoutAccountPanel';
import { OWNER_COPY } from '../payout-account-view';

/** A household's receiving account: where its customers' payments for orders land. */
export function VendorPayoutAccountScreen() {
  return (
    <Screen>
      <AppHeader title={OWNER_COPY.vendor.title} back />
      {isLiveApi ? <PayoutAccountPanel owner="vendor" /> : <NeedsServer />}
    </Screen>
  );
}

/** A ward's receiving account: where households' rental fees land. */
export function WardPayoutAccountScreen() {
  return (
    <WardGate>
      <Screen>
        <AppHeader title={OWNER_COPY.ward.title} back />
        <PayoutAccountPanel owner="ward" />
      </Screen>
    </WardGate>
  );
}

function NeedsServer() {
  return (
    <p
      role="status"
      className="flex max-w-[720px] items-start gap-xs rounded-[16px] bg-sunken/60 p-md text-body-md text-text/80"
    >
      <Icon name="information-outline" size={20} color="currentColor" className="mt-0.5 shrink-0" />
      <span>
        Kết nối tài khoản nhận tiền cần máy chủ thật. Ở chế độ demo không có thanh toán online nên
        màn này chưa dùng được.
      </span>
    </p>
  );
}
