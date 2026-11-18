import { useState } from 'react';

import { Button, Icon } from '@/components/common';
import { useInstallPrompt } from '@/core/pwa/install-prompt';

const DISMISSED_KEY = 'streetbiz:install-card-dismissed';

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * "Cài StreetBiz": put the app on the home screen so the permit opens with no signal.
 * Android and desktop Chrome get a button (the browser's own install prompt); iPhone has no such
 * prompt, so it gets the three taps. Shown only where installing is possible and not yet done,
 * and a vendor who closes it is not asked again.
 */
export function InstallAppCard() {
  const install = useInstallPrompt();
  const [hidden, setHidden] = useState(wasDismissed);
  if (install.kind === 'none' || hidden) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Not remembered across visits; hidden for this one.
    }
  };

  return (
    <section
      aria-label="Cài StreetBiz lên màn hình chính"
      className="flex flex-col gap-sm rounded-[20px] bg-tint-primary p-md ring-1 ring-border"
    >
      <div className="flex items-start gap-sm">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-card"
        >
          <Icon name="phone-outline" size={22} color="currentColor" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold leading-5 text-text">
            Cài StreetBiz lên điện thoại
          </h2>
          <p className="mt-0.5 text-body-md text-muted">
            Mở nhanh như một ứng dụng, và giấy phép vẫn hiện được khi mất sóng.
          </p>
        </div>
      </div>

      {install.kind === 'prompt' ? (
        <Button
          label="Cài ứng dụng"
          size="sm"
          fullWidth={false}
          onPress={() => void install.install()}
        />
      ) : (
        <ol className="flex list-decimal flex-col gap-1 pl-md text-body-md text-text">
          <li>Mở trang này bằng Safari.</li>
          <li>Chạm nút Chia sẻ (hình vuông có mũi tên lên).</li>
          <li>Chọn &quot;Thêm vào MH chính&quot;.</li>
        </ol>
      )}

      <button
        type="button"
        onClick={dismiss}
        className="inline-flex min-h-11 items-center self-start text-label font-semibold text-muted hover:text-text"
      >
        Để sau
      </button>
    </section>
  );
}
