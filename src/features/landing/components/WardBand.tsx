import { Link } from 'react-router-dom';

import { Icon, type IconName } from '@/components/common';
import { PermitStamp, VERDICT_TONES } from '@/components/illustrations';
import { ctaClass } from './link-styles';

const CAPABILITIES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'inbox-outline',
    title: 'Hộp duyệt hồ sơ tập trung',
    body: 'Hồ sơ kinh doanh, đơn thuê ô, gia hạn và chuyển nhượng về một nơi, cán bộ quyết định.',
  },
  {
    icon: 'qrcode',
    title: 'Giấy phép QR tra trực tiếp',
    body: 'Mỗi lần quét đều hỏi thẳng máy chủ, không dùng kết quả lưu sẵn.',
  },
  {
    icon: 'file-document-outline',
    title: 'Ghi nhận vi phạm có biên bản',
    body: 'Vi phạm gắn với ô, có ảnh và biên bản; mức phạt do cán bộ quyết định.',
  },
];

/**
 * For the ward: what the platform does for them, in their words, beside a
 * sample permit drawn like the real pass (kerb along the top, slot plate,
 * a QR-like pattern that is deliberately not a readable code, ward stamp).
 */
export function WardBand() {
  return (
    <section
      id="cho-phuong"
      aria-labelledby="cho-phuong-title"
      className="scroll-mt-[88px] overflow-x-clip bg-card"
    >
      <div className="mx-auto grid max-w-[1304px] gap-xl px-md py-2xl md:px-lg md:py-[72px] lg:grid-cols-2 lg:items-center xl:px-xl xl:py-[96px]">
        <div className="min-w-0">
          <h2
            id="cho-phuong-title"
            className="font-editorial text-[32px] font-semibold leading-[38px] tracking-[-0.02em] text-text [font-variation-settings:'opsz'_60] md:text-[40px] md:leading-[46px] xl:text-[44px] xl:leading-[52px]"
          >
            Cho phường
          </h2>
          <p className="mt-sm max-w-[52ch] text-body-lg text-muted">
            Phường là nơi quyết định trên vỉa hè. StreetBiz gom hồ sơ, giấy phép và vi phạm vào một
            bảng làm việc.
          </p>
          <ul className="mt-lg flex flex-col gap-md">
            {CAPABILITIES.map((item) => (
              <li key={item.title} className="flex items-start gap-sm">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-tint-tertiary text-tertiary">
                  <Icon name={item.icon} size={22} color="currentColor" weight="duotone" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[17px] font-bold leading-6 text-text">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-body-md text-muted">{item.body}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-lg flex flex-col gap-sm sm:flex-row sm:flex-wrap">
            <Link to="/customer/scan" className={ctaClass('primary', 'md')}>
              <Icon name="qrcode-scan" size={20} color="currentColor" />
              Kiểm tra một giấy phép
            </Link>
            <Link to="/auth/sign-in" className={ctaClass('outline', 'md')}>
              Đăng nhập cán bộ
            </Link>
          </div>
        </div>

        <SamplePermit />
      </div>
    </section>
  );
}

/** Deterministic dots for a QR-like pattern; no finder squares, so it can never scan. */
const PATTERN = Array.from({ length: 121 }, (_, i) => ((i * 37 + (i >> 3) * 11) % 7) % 3 !== 0);

function SamplePermit() {
  const ok = VERDICT_TONES.ok;
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[460px] lg:mr-0">
      <div className="relative -rotate-1 overflow-hidden rounded-[28px] bg-card shadow-sheet ring-1 ring-border">
        <span className="sb-kerb block" />
        <div className="p-md md:p-lg">
          <div className="flex items-center justify-between gap-sm">
            <span className="flex h-11 items-center rounded-[8px] bg-card px-sm font-sign text-[26px] font-extrabold leading-none tracking-[0.03em] text-text ring-[2.5px] ring-text [font-stretch:66%]">
              A-04
            </span>
            <span className="rounded-full bg-sunken px-sm py-1 text-[12px] font-semibold text-[#2B3640] dark:text-[#C5D0DA]">
              Mẫu minh họa
            </span>
          </div>
          <p className="mt-md font-editorial text-[26px] font-semibold leading-[32px] text-text">
            Bánh mì Cô Ba
          </p>
          <p className="text-body-md text-muted">Giấy phép sử dụng vỉa hè</p>

          <div className="mt-md flex items-end gap-md">
            <span className="grid h-[112px] w-[112px] shrink-0 grid-cols-11 gap-[2px] rounded-[10px] bg-card p-1.5 ring-1 ring-border">
              {PATTERN.map((on, i) => (
                <span key={i} className={on ? 'rounded-[1.5px] bg-[#111C2B] dark:bg-text' : ''} />
              ))}
            </span>
            <div
              className={`flex min-w-0 flex-1 flex-col gap-1 rounded-[14px] px-sm py-sm ${ok.wash} ${ok.ink}`}
            >
              <Icon name="check-circle" size={22} color="currentColor" weight="fill" />
              <span className="font-sign text-[22px] font-extrabold leading-none [font-stretch:88%]">
                Hợp lệ
              </span>
              <span className="text-[12px] font-medium opacity-90">Ví dụ kết quả tra cứu</span>
            </div>
          </div>
        </div>
      </div>
      <PermitStamp
        icon={ok.icon}
        inkClass={ok.ink}
        strokeClass={ok.stroke}
        ringText="MẪU MINH HỌA ★ STREETBIZ ★"
        className="absolute -right-3 -top-6 h-[104px] w-[104px] md:-right-6 md:h-[124px] md:w-[124px]"
      />
    </div>
  );
}
