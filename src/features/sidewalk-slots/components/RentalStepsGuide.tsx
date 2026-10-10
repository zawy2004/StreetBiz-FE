import { Icon, type IconName } from '@/components/common';

const STEPS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'bookmark-outline',
    title: 'Giữ chỗ 15 phút',
    text: 'Chạm một ô còn trống trên sơ đồ để giữ trong lúc cân nhắc. Hộ khác không giữ được ô đó.',
  },
  {
    icon: 'file-document-outline',
    title: 'Nộp đơn thuê',
    text: 'Chọn thời hạn, xem tạm tính, đồng ý hai cam kết rồi nộp. Cần hồ sơ kinh doanh đã được Phường duyệt.',
  },
  {
    icon: 'shield-check-outline',
    title: 'Phường duyệt',
    text: 'Duyệt xong là hợp đồng và giấy phép QR được tạo tự động, xem ở "Thuê ô của tôi".',
  },
];

/** The panel before any slot is chosen: what to do, and the three steps from a slot to a permit. */
export function RentalStepsGuide() {
  return (
    <div className="flex flex-col gap-md overflow-hidden rounded-[24px] bg-card shadow-card ring-1 ring-border">
      <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
      <div className="flex flex-col gap-md px-md pb-md md:px-lg md:pb-lg">
        <div className="flex items-center gap-sm">
          <span
            aria-hidden="true"
            className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] border-2 border-dashed border-brand/60 bg-[#FFF3E8] text-primary dark:bg-[#2A2420]"
          >
            <Icon name="crosshairs-gps" size={26} color="currentColor" weight="fill" />
          </span>
          <div className="min-w-0">
            <p className="font-sign text-[20px] font-bold leading-tight text-text">
              Chọn một ô để xem chi tiết
            </p>
            <p className="mt-0.5 text-body-sm text-muted">Thuê ô trong 3 bước</p>
          </div>
        </div>
        <ol className="flex flex-col">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative flex gap-sm pb-md last:pb-0">
              {i < STEPS.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="absolute left-[19px] top-10 h-[calc(100%-40px)] w-0.5 bg-brand/30"
                />
              ) : null}
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tint-primary text-primary">
                <Icon name={step.icon} size={20} color="currentColor" weight="duotone" />
              </span>
              <div className="min-w-0 pt-1">
                <p className="text-body-md font-semibold text-text">
                  <span className="mr-1 font-sign text-primary">{i + 1}.</span>
                  {step.title}
                </p>
                <p className="mt-0.5 text-body-sm text-muted">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
