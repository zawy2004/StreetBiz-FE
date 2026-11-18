import { useState } from 'react';
import { useLocation } from 'react-router-dom';

import { Button, Icon } from '@/components/common';
import { BottomSheet } from '@/components/layout';
import { isInAppBrowser, promptInstall, useInstallKind, type InstallKind } from '@/core/pwa';

const DISMISSED_KEY = 'streetbiz-install-dismissed';
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

function wasDismissedRecently(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISSED_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
}

function rememberDismissed() {
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  } catch {
    // Storage blocked: the banner just comes back next visit.
  }
}

/** The iOS Share glyph (a box with an arrow leaving it), so people can find the button. */
function ShareGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block align-[-4px] text-primary"
    >
      <path d="M12 15V3.5M8.2 7.2 12 3.4l3.8 3.8" />
      <path d="M7.5 10H6.5A1.5 1.5 0 0 0 5 11.5v7A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5h-1" />
    </svg>
  );
}

function IosSteps({ onClose }: { onClose: () => void }) {
  const inApp = isInAppBrowser();
  return (
    <>
      <div className="flex items-center gap-sm">
        <img src="/icons/icon-192.png" alt="" width={48} height={48} className="rounded-[12px]" />
        <div className="min-w-0">
          <h2 className="font-heading text-headline-sm text-text">Thêm StreetBiz vào màn hình chính</h2>
          <p className="text-body-sm text-muted">Mở như một ứng dụng, không cần App Store.</p>
        </div>
      </div>
      {inApp ? (
        <p role="status" className="rounded-sm bg-tint-primary p-sm text-body-sm text-text">
          Bạn đang mở trong ứng dụng khác (Zalo, Facebook…). Hãy chọn <b>Mở bằng Safari</b> trước, rồi làm theo
          các bước dưới đây.
        </p>
      ) : null}
      <ol className="flex flex-col gap-sm text-body-md text-text">
        <li className="flex gap-sm">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-label font-bold text-on-primary">
            1
          </span>
          <span>
            Trong Safari, nhấn nút <b>Chia sẻ</b> <ShareGlyph /> ở thanh phía dưới (hoặc phía trên) màn hình.
          </span>
        </li>
        <li className="flex gap-sm">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-label font-bold text-on-primary">
            2
          </span>
          <span>
            Kéo xuống và chọn <b>Thêm vào MH chính</b> (Add to Home Screen).
          </span>
        </li>
        <li className="flex gap-sm">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-label font-bold text-on-primary">
            3
          </span>
          <span>
            Nhấn <b>Thêm</b>. Biểu tượng StreetBiz sẽ xuất hiện trên màn hình chính.
          </span>
        </li>
      </ol>
      <Button label="Đã hiểu" onPress={onClose} />
    </>
  );
}

/**
 * One tap: Chrome/Android opens its install dialog; iOS shows the Share-menu steps in a sheet.
 * Returns the button's handler and the sheet to render.
 */
function useInstallAction(kind: InstallKind) {
  const [sheet, setSheet] = useState(false);
  const run = async () => {
    if (kind === 'prompt') await promptInstall();
    else setSheet(true);
  };
  const sheetNode = (
    <BottomSheet visible={sheet} onClose={() => setSheet(false)}>
      <IosSteps onClose={() => setSheet(false)} />
    </BottomSheet>
  );
  return { run, sheetNode };
}

const BANNER_ROUTES = (pathname: string) => pathname === '/' || pathname.startsWith('/auth');

/**
 * A dismissible offer shown on phones, on the landing and sign-in pages only (they have no tab
 * bar to collide with). Hidden once installed, and for a week after "Để sau".
 */
export function InstallAppBanner() {
  const { pathname } = useLocation();
  const kind = useInstallKind();
  const [dismissed, setDismissed] = useState(wasDismissedRecently);
  const { run, sheetNode } = useInstallAction(kind);

  if (kind === 'hidden' || dismissed || !BANNER_ROUTES(pathname)) return null;
  return (
    <>
      <section
        aria-label="Cài StreetBiz lên điện thoại"
        className="fixed inset-x-sm bottom-[calc(92px+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-[440px] items-center gap-sm rounded-[20px] bg-card p-sm shadow-sheet ring-1 ring-border lg:hidden"
      >
        <img src="/icons/icon-192.png" alt="" width={44} height={44} className="shrink-0 rounded-[10px]" />
        <div className="min-w-0 flex-1">
          <p className="text-label font-semibold text-text">Dùng StreetBiz như ứng dụng</p>
          <p className="text-body-sm text-muted">Thêm vào màn hình chính để mở nhanh.</p>
        </div>
        <Button
          label={kind === 'prompt' ? 'Cài đặt' : 'Hướng dẫn'}
          size="sm"
          fullWidth={false}
          onPress={() => void run()}
        />
        <button
          type="button"
          aria-label="Để sau"
          onClick={() => {
            rememberDismissed();
            setDismissed(true);
          }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-sunken"
        >
          <Icon name="close-circle-outline" size={22} color="currentColor" />
        </button>
      </section>
      {sheetNode}
    </>
  );
}

/** The same offer as a tile in the account screen, where it can always be found again. */
export function InstallAppTile() {
  const kind = useInstallKind();
  const { run, sheetNode } = useInstallAction(kind);
  if (kind === 'hidden') return null;
  return (
    <>
      <button
        type="button"
        onClick={() => void run()}
        className="flex min-h-16 w-full items-center gap-sm rounded-sm border border-border bg-card p-sm text-left transition-colors hover:bg-sunken"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-tint-primary text-primary">
          <Icon name="devices" size={24} color="currentColor" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-label font-semibold text-text">Thêm vào màn hình chính</span>
          <span className="block text-body-sm text-muted">Mở StreetBiz như một ứng dụng trên điện thoại</span>
        </span>
      </button>
      {sheetNode}
    </>
  );
}
