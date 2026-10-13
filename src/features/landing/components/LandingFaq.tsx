import { Icon } from '@/components/common';

/** Only what the product does today: no promises of features it does not have. */
const QUESTIONS = [
  {
    q: 'Người mua có cần tài khoản không?',
    a: 'Không cần để xem quán và thực đơn. Bạn chỉ cần tài khoản khi đặt món.',
  },
  {
    q: 'Hộ kinh doanh bắt đầu thế nào?',
    a: 'Tạo tài khoản Hộ kinh doanh bằng số điện thoại và mã OTP, nộp hồ sơ kinh doanh, rồi chọn ô vỉa hè và gửi đơn thuê. Phường duyệt xong thì giấy phép QR được cấp.',
  },
  {
    q: 'Kiểm tra giấy phép của một quán bằng cách nào?',
    a: 'Mở trang kiểm tra giấy phép, nhập hoặc dán nội dung mã QR in trên giấy phép. Kết quả luôn được tra trực tiếp với máy chủ.',
  },
  {
    q: 'Thanh toán bằng gì?',
    a: 'Đơn hàng thanh toán qua ví MoMo hoặc ZaloPay. Đơn chỉ được tính là đã trả khi hệ thống nhận được xác nhận từ ví.',
  },
];

export function LandingFaq() {
  return (
    <section aria-labelledby="faq-title" className="bg-bg">
      <div className="mx-auto grid max-w-[1304px] gap-lg px-md py-2xl md:px-lg md:py-[72px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-2xl xl:px-xl">
        <h2
          id="faq-title"
          className="font-editorial text-[32px] font-semibold leading-[38px] tracking-[-0.02em] text-text [font-variation-settings:'opsz'_60] md:text-[40px] md:leading-[46px]"
        >
          Câu hỏi thường gặp
        </h2>
        <div className="divide-y divide-border overflow-hidden rounded-[24px] bg-card ring-1 ring-border">
          {QUESTIONS.map((item) => (
            <details key={item.q} className="group">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-md px-md py-sm text-[17px] font-semibold leading-6 text-text transition-colors hover:bg-sunken/60 md:px-lg [&::-webkit-details-marker]:hidden">
                {item.q}
                <span className="shrink-0 text-muted transition-transform duration-200 group-open:rotate-180">
                  <Icon name="chevron-down" size={20} color="currentColor" />
                </span>
              </summary>
              <p className="max-w-[68ch] px-md pb-md text-body-lg text-muted md:px-lg">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
