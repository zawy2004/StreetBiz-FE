import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import brandMark from '@/assets/brand/streetbiz-mark-orange.png';
import { Button, Icon, QrCode } from '@/components/common';
import { EmptyState, Skeleton } from '@/components/feedback';
import { communityApi, CommunityApiError } from '@/features/vendor-map/community-api';
import { publicPagePath, scanLinkFor } from '../permit-link';
import { formatBoardStamp, priceWithUnit } from '../price-board-format';

/**
 * A5 portrait, small margins: the sheet hung at the stall. The app-wide assistant bubble
 * floats over every page and must not end up on the paper.
 */
const PAGE_CSS =
  '@page { size: A5 portrait; margin: 8mm; } @media print { .sb-launcher { display: none !important; } }';

/**
 * BUY-06 `/q/:token/print`: the price board to print on A5 and hang at the stall (the paper
 * board stays required; the QR only adds a way to check it). The board is read live from the
 * permit check; its QR is `/q/<token>?v=N`, so a buyer scanning an old print is told the
 * prices changed. Public, so the vendor app can open it without a sign-in.
 */
export function PrintPriceBoardScreen() {
  const { token = '' } = useParams<{ token: string }>();
  // Only an answer fetched for this page is printed, never one left from an earlier visit.
  const [visitStart] = useState(() => Date.now());
  const check = useQuery({
    queryKey: ['public-permit-print', token],
    queryFn: () => communityApi.verifyPermit(token),
    enabled: token.length > 0,
    gcTime: 0,
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const result = check.data && check.dataUpdatedAt >= visitStart ? check.data : undefined;
  const board = result?.isValid ? result.priceBoard : null;
  const stamp = formatBoardStamp(board?.updatedAt);

  return (
    <div className="min-h-full bg-sunken/60 px-md py-lg print:bg-white print:p-0">
      <style>{PAGE_CSS}</style>
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-md print:max-w-none">
        <div className="flex flex-wrap items-center justify-between gap-sm print:hidden">
          <Link
            to={publicPagePath(token)}
            className="inline-flex min-h-11 items-center gap-xs text-label font-semibold text-primary hover:underline"
          >
            <Icon name="arrow-left" size={18} color="currentColor" />
            Trang kiểm tra quầy
          </Link>
          {board ? (
            <div className="w-full sm:w-auto">
              <Button
                label="In bảng giá (khổ A5)"
                icon={<Icon name="printer" size={19} color="currentColor" />}
                onPress={() => window.print()}
              />
            </div>
          ) : null}
        </div>

        {!result && check.fetchStatus === 'fetching' ? (
          <div
            role="status"
            aria-label="Đang tải bảng giá"
            className="flex flex-col gap-sm rounded-[16px] bg-card p-lg"
          >
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : check.isError ? (
          <EmptyState
            tone="danger"
            icon="alert-circle-outline"
            title="Không tải được bảng giá"
            description={
              check.error instanceof CommunityApiError
                ? check.error.message
                : 'Kiểm tra kết nối mạng rồi thử lại.'
            }
            action={
              <Button
                label="Thử lại"
                variant="outline"
                fullWidth={false}
                onPress={() => void check.refetch()}
              />
            }
          />
        ) : result && !board ? (
          <EmptyState
            tone="danger"
            icon="shield-alert-outline"
            title="Chưa in được bảng giá"
            description={
              result.isValid
                ? 'Quầy chưa có bảng giá trên StreetBiz. Thêm món, giá và đơn vị tính ở mục Thực đơn trước.'
                : 'Giấy phép của quầy không còn hiệu lực, nên bảng giá không được công bố.'
            }
          />
        ) : board && result ? (
          <article
            aria-label="Bảng giá in khổ A5"
            className="flex aspect-[148/210] w-full flex-col overflow-hidden rounded-[6px] bg-white p-[7%] text-[#111C2B] shadow-sheet ring-1 ring-black/10 print:aspect-auto print:h-[194mm] print:rounded-none print:p-0 print:shadow-none print:ring-0"
          >
            <header className="flex items-start justify-between gap-sm border-b-[3px] border-[#111C2B] pb-[3%]">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#5B6673]">
                  Bảng giá niêm yết · Price list
                </p>
                <h1 className="mt-1 font-editorial text-[28px] font-semibold leading-tight">
                  {result.displayName ?? 'Quầy hàng'}
                </h1>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-[8px] px-2 py-1 ring-[2.5px] ring-[#111C2B]">
                <span className="text-[11px] font-semibold uppercase text-[#5B6673]">Ô</span>
                <span className="font-sign text-[26px] font-extrabold leading-none tracking-[0.03em] [font-stretch:66%]">
                  {result.slotCode ?? '—'}
                </span>
              </span>
            </header>

            <ul aria-label="Các món và giá" className="mt-[4%] flex flex-1 flex-col gap-[2.5%]">
              {board.items.map((item) => (
                <li key={item.menuItemId} className="flex items-end gap-2">
                  <span className="min-w-0">
                    <span className="block text-[19px] font-semibold leading-snug">
                      {item.name}
                    </span>
                    {item.nameEn ? (
                      <span lang="en" className="block text-[12px] italic text-[#5B6673]">
                        {item.nameEn}
                      </span>
                    ) : null}
                  </span>
                  <span
                    aria-hidden="true"
                    className="mb-[6px] min-w-[16px] flex-1 border-b-2 border-dotted border-[#9AA4AF]"
                  />
                  <span className="shrink-0 font-sign text-[22px] font-extrabold leading-tight font-tabular [font-stretch:92%]">
                    {priceWithUnit(item.unitPrice, item.priceUnit)}
                  </span>
                </li>
              ))}
            </ul>

            <footer className="mt-[4%] flex items-end justify-between gap-sm border-t border-dashed border-[#9AA4AF] pt-[3%]">
              <div className="flex min-w-0 flex-col gap-1 text-[12px] leading-snug text-[#2B3640]">
                <p className="text-[14px] font-bold text-[#111C2B]">
                  Bản số {board.version}
                  {stamp ? ` — cập nhật ${stamp}` : ''}
                </p>
                <p className="font-semibold text-[#111C2B]">Treo bảng này tại quầy.</p>
                <p>Giá bằng đồng Việt Nam cho mỗi đơn vị tính.</p>
                <p>Quét mã để kiểm tra giấy phép và giá hiện tại.</p>
                <p lang="en" className="italic text-[#5B6673]">
                  Scan to check the permit and current prices.
                </p>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-[#5B6673]">
                  <img src={brandMark} alt="" width={14} height={14} /> StreetBiz · Đà Nẵng
                </p>
              </div>
              <div className="shrink-0 [&_[data-testid=qr-code]]:p-1">
                <QrCode value={scanLinkFor(token, board.version)} size={112} />
              </div>
            </footer>
          </article>
        ) : null}

        {board ? (
          <p className="flex items-start gap-xs rounded-[14px] bg-tint-primary px-md py-sm text-body-md font-semibold text-primary print:hidden">
            <Icon
              name="storefront-outline"
              size={18}
              color="currentColor"
              className="mt-0.5 shrink-0"
            />
            In ra giấy A5 và treo ở nơi khách dễ thấy: bảng giá giấy là bắt buộc, mã QR chỉ bổ sung.
            In lại mỗi khi đổi giá.
          </p>
        ) : null}
      </div>
    </div>
  );
}
