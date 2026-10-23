import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { Button, Icon } from '@/components/common';
import { Skeleton } from '@/components/feedback';
import { VERDICT_TONES } from '@/components/illustrations';
import type { VendorReportType } from '@/core/api/ai-api';
import {
  communityApi,
  CommunityApiError,
  type PermitVerification,
} from '@/features/vendor-map/community-api';
import { LiveLookupChip } from '@/features/vendor-map/components/scan/ScanParts';
import { CityFeedbackLink, ComplaintActions } from '../components/ComplaintActions';
import { PermitVerdictCard } from '../components/PermitVerdictCard';
import { PriceBoardCard } from '../components/PriceBoardCard';
import { PublicShell } from '../components/PublicShell';
import { parseVersion } from '../permit-link';
import { reportFormPath } from '../report-link';

/** The complaints a check leaves open: all three on a valid board, fewer when there is none. */
function complaintTypes(result: PermitVerification): VendorReportType[] {
  if (!result.vendorId) return [];
  if (!result.isValid) return ['GENERAL'];
  return result.priceBoard
    ? ['OVERCHARGE', 'PRICE_NOT_POSTED', 'GENERAL']
    : ['PRICE_NOT_POSTED', 'GENERAL'];
}

/**
 * BUY-06 `/q/:token`: what an ordinary phone camera opens from the QR printed on a stall's
 * price board. Every visit is a live lookup (BR-39: `gcTime` 0, nothing kept for the next
 * scan, the server logs each check). The price board shows only for a VALID permit; the
 * printed board's `?v=` is sent along so an outdated paper board is called out.
 */
export function PublicPermitScreen() {
  const { token = '' } = useParams<{ token: string }>();
  const [params] = useSearchParams();
  const printedVersion = parseVersion(params.get('v'));
  const navigate = useNavigate();
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Only an answer fetched since this visit began is ever shown, never one left from before.
  const [visitStart] = useState(() => Date.now());

  const check = useQuery({
    queryKey: ['public-permit-check', token, printedVersion ?? null],
    queryFn: () => communityApi.verifyPermit(token, undefined, printedVersion),
    enabled: token.length > 0,
    gcTime: 0,
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const result = check.data && check.dataUpdatedAt >= visitStart ? check.data : undefined;

  useEffect(() => {
    if (result) headingRef.current?.focus({ preventScroll: true });
  }, [result, check.dataUpdatedAt]);

  const pick = (type: VendorReportType) => {
    if (!result?.vendorId) return;
    navigate(reportFormPath(result, token, type));
  };

  return (
    <PublicShell aside={<LiveLookupChip />}>
      <div className="flex flex-col gap-1">
        <h1 className="font-editorial text-[32px] font-semibold leading-[1.08] tracking-[-0.02em] text-text lg:text-[38px]">
          Kiểm tra quầy
          <span lang="en" className="block text-[18px] font-normal tracking-normal text-muted">
            Stall check · Đà Nẵng
          </span>
        </h1>
        <p className="text-body-md text-muted">
          Giấy phép vỉa hè và bảng giá, tra trực tiếp với máy chủ của phường.
          <span lang="en" className="block text-body-sm">
            Sidewalk permit and posted prices, looked up live with the ward&apos;s server.
          </span>
        </p>
      </div>

      {!result && check.fetchStatus === 'fetching' ? (
        <div
          role="status"
          aria-label="Đang kiểm tra trực tiếp…"
          className="flex flex-col gap-md overflow-hidden rounded-[28px] bg-card p-lg ring-1 ring-border"
        >
          <Skeleton className="h-12 w-[150px] !rounded-[8px]" />
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
          <p className="flex items-center gap-xs text-body-md font-medium text-text">
            <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-brand" />
            Đang kiểm tra trực tiếp…{' '}
            <span lang="en" className="text-muted">
              Checking live…
            </span>
          </p>
        </div>
      ) : check.isError ? (
        <div
          role="alert"
          className={`flex flex-col items-start gap-sm rounded-[24px] p-md md:p-lg ${VERDICT_TONES.danger.wash}`}
        >
          <p
            className={`flex items-start gap-xs text-body-lg font-semibold ${VERDICT_TONES.danger.ink}`}
          >
            <Icon
              name="alert-circle-outline"
              size={22}
              color="currentColor"
              className="mt-0.5 shrink-0"
            />
            <span>
              {check.error instanceof CommunityApiError
                ? check.error.message
                : 'Không kiểm tra được giấy phép lúc này.'}
              <span lang="en" className="block text-body-md font-normal">
                The permit could not be checked right now.
              </span>
            </span>
          </p>
          <Button
            label="Kiểm tra lại · Check again"
            variant="outline"
            fullWidth={false}
            onPress={() => void check.refetch()}
          />
        </div>
      ) : result ? (
        <>
          <PermitVerdictCard
            result={result}
            checkedAt={check.dataUpdatedAt ? new Date(check.dataUpdatedAt) : null}
            headingRef={headingRef}
          />

          {result.isValid && result.priceBoard ? (
            <PriceBoardCard board={result.priceBoard} printedVersion={printedVersion} bilingual>
              <ComplaintActions types={complaintTypes(result)} onPick={pick} bilingual />
            </PriceBoardCard>
          ) : (
            <section
              aria-label="Phản ánh"
              className="flex flex-col gap-md rounded-[24px] bg-card p-md shadow-card ring-1 ring-border md:p-lg"
            >
              {result.isValid ? (
                <p className="text-body-md text-text">
                  Quầy chưa niêm yết giá trên StreetBiz. Bảng giá giấy tại quầy vẫn là bắt buộc.
                  <span lang="en" className="block text-body-sm text-muted">
                    This stall has no price board on StreetBiz yet. A paper price board at the stall
                    is still required.
                  </span>
                </p>
              ) : (
                <p
                  className={`flex items-start gap-xs rounded-[14px] px-md py-sm text-body-md font-semibold ${VERDICT_TONES.danger.wash} ${VERDICT_TONES.danger.ink}`}
                >
                  <Icon
                    name="shield-alert-outline"
                    size={20}
                    color="currentColor"
                    className="mt-0.5 shrink-0"
                  />
                  <span>
                    Đừng dựa vào mã này khi mua hàng. Bảng giá chỉ hiện khi giấy phép còn hiệu lực.
                    <span lang="en" className="block font-normal">
                      Do not rely on this code. Prices show only for a valid permit.
                    </span>
                  </span>
                </p>
              )}
              <ComplaintActions types={complaintTypes(result)} onPick={pick} bilingual />
            </section>
          )}

          <div className="flex flex-wrap items-center justify-between gap-sm">
            <Button
              label="Kiểm tra lại · Check again"
              variant="ghost"
              fullWidth={false}
              loading={check.isFetching}
              icon={<Icon name="replay" size={18} color="currentColor" />}
              onPress={() => void check.refetch()}
            />
          </div>
        </>
      ) : null}

      <CityFeedbackLink bilingual />
    </PublicShell>
  );
}
