import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { Screen } from '@/components/layout';
import { prefersReducedMotion } from '@/features/buyer-discovery/rolling-number';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { BuyerPageHeader } from '../components/BuyerPageHeader';
import {
  CheckingPass,
  CodeSlot,
  LiveLookupChip,
  OfflineNote,
  PublicNotFoundPass,
  PublicPermitPass,
  ScanIdle,
} from '../components/scan/ScanParts';
import { communityApi, CommunityApiError } from '../community-api';

type Point = { latitude: number; longitude: number };

function currentPosition(): Promise<Point | undefined> {
  if (!navigator.geolocation) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      () => resolve(undefined),
      { enableHighAccuracy: true, timeout: 7_000 },
    );
  });
}

/**
 * A buyer's permit check at the counter. Paste the code, press "Kiểm tra":
 * every press is a fresh POST to the server (BR-39: no cache, no storage, the
 * result lives only in this mutation), and the answer arrives as a permit pass
 * with the ward's stamp coming down on it.
 */
export function PublicScanScreen() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const [code, setCode] = useState('');
  // Display only: where the buyer was for this check (the same point sent with it), to show the distance.
  const [lastPoint, setLastPoint] = useState<Point | undefined>();
  const verification = useMutation({
    mutationFn: async () =>
      communityApi.verifyPermit(
        code.trim(),
        await currentPosition().then((point) => {
          setLastPoint(point);
          return point;
        }),
      ),
  });
  const result = verification.data;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // When an answer lands, bring it into view on a phone and move focus to its verdict.
  useEffect(() => {
    if (verification.status !== 'success') return;
    headingRef.current?.focus({ preventScroll: true });
    if (!isDesktop) {
      resultRef.current?.scrollIntoView?.({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start',
      });
    }
  }, [verification.status, verification.submittedAt, isDesktop]);

  let board;
  if (verification.isPending) {
    board = <CheckingPass />;
  } else if (result && !result.permitId) {
    board = <PublicNotFoundPass headingRef={headingRef} />;
  } else if (result) {
    board = (
      <PublicPermitPass
        result={result}
        checkedAt={verification.submittedAt ? new Date(verification.submittedAt) : null}
        userPoint={lastPoint}
        headingRef={headingRef}
        onProfile={
          result.vendorId
            ? () => navigate(`/customer/explore/vendors/${result.vendorId}`)
            : undefined
        }
        onReport={
          result.vendorId
            ? () =>
                navigate(
                  `/customer/explore/vendors/${result.vendorId}/reports/new?permitId=${result.permitId}&slotId=${result.slotId}`,
                )
            : undefined
        }
      />
    );
  } else {
    board = <ScanIdle />;
  }

  return (
    <Screen>
      <BuyerPageHeader
        title="Quét mã QR"
        subtitle="Xác thực giấy phép trực tiếp với Backend"
        back={false}
        right={<LiveLookupChip />}
      />
      <OfflineNote />
      <div className="grid gap-lg lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start xl:grid-cols-[400px_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-0">
          <CodeSlot
            code={code}
            onCodeChange={(value) => setCode(value.slice(0, 500))}
            error={
              verification.error instanceof CommunityApiError
                ? verification.error.message
                : undefined
            }
            checking={verification.isPending}
            onCheck={() => verification.mutate()}
          />
        </div>
        <div ref={resultRef} className="min-h-[320px] min-w-0 scroll-mt-md">
          {board}
        </div>
      </div>
    </Screen>
  );
}
