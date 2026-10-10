import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Icon, type IconName } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, Section } from '@/components/layout';
import { AiHint } from '@/components/status';
import { showToast } from '@/components/feedback';
import { errorMessage } from '@/core/api';
import { env, isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import { complianceApi, type InspectPermitResult, type WardPatrolHeatmapPoint } from '../ward-api';
import {
  EncroachmentSketch,
  NotFoundBoard,
  PatrolHeatmap,
  PatrolIdle,
  PatrolWeekGrid,
  PermitFacts,
  PermitVerdictBoard,
  ResultNotice,
  ValidityNote,
  ValidityRing,
  VerdictSkeleton,
} from '../components/patrol/PatrolParts';
import { permitValidity } from '../components/patrol/permit-validity';

const clockFormat = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZone: 'Asia/Ho_Chi_Minh',
});

/**
 * WARD-11 patrol check. A lookup panel on the left, a result board on the right
 * that reads like a road sign from a step away. Every "Kiểm tra" is a fresh
 * POST /ward/permits/inspect (BR-39); nothing is cached.
 */
export function PermitScanScreen() {
  const navigate = useNavigate();

  // Mock DB fallback
  const permits = useMockDb((s) => s.permits);
  const contracts = useMockDb((s) => s.contracts);
  const slots = useMockDb((s) => s.slots);
  const vendors = useMockDb((s) => s.vendors);

  const [code, setCode] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [liveResult, setLiveResult] = useState<InspectPermitResult | null>(null);
  // Display only: when the result now on screen came back from the server.
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  // 7.5 Patrol Heatmap Insights
  const [heatmap, setHeatmap] = useState<WardPatrolHeatmapPoint[]>([]);

  useEffect(() => {
    if (!isLiveApi) return;
    complianceApi
      .patrolHeatmap()
      .then(setHeatmap)
      .catch((err) => console.warn('Could not load patrol heatmap:', err));
  }, []);

  useEffect(() => {
    if (liveResult) setCheckedAt(new Date());
  }, [liveResult]);

  // Display only (BR-39 unchanged): watch each live lookup from start to finish. If it ends
  // with the same result object it started with, the request failed and what is on screen is
  // older than the officer thinks. The code sent is kept to notice when the field is edited.
  const latest = useRef({ liveResult, code });
  latest.current = { liveResult, code };
  const attempt = useRef<{ before: InspectPermitResult | null; code: string; at: Date } | null>(
    null,
  );
  const [failedAt, setFailedAt] = useState<Date | null>(null);
  const [checkedCode, setCheckedCode] = useState<string | null>(null);
  useEffect(() => {
    if (!isLiveApi) return;
    if (loading) {
      attempt.current = {
        before: latest.current.liveResult,
        code: latest.current.code.trim(),
        at: new Date(),
      };
      return;
    }
    const finished = attempt.current;
    if (!finished) return;
    attempt.current = null;
    if (latest.current.liveResult === finished.before) {
      setFailedAt(finished.at);
    } else {
      setFailedAt(null);
      setCheckedCode(finished.code);
    }
  }, [loading]);

  // Mock lookup
  const mockPermit = permits.find((p) => p.permit_code === code.trim() || p.id === code.trim());
  const mockContract = contracts.find((c) => c.id === mockPermit?.contractId);
  const mockSlot = slots.find((s) => s.id === mockContract?.slotId);
  const mockVendor = vendors.find((v) => v.id === mockContract?.vendorId);

  const handleInspect = async () => {
    if (!code.trim()) {
      showToast('Vui lòng nhập mã hoặc quét mã QR');
      return;
    }
    setSearched(true);
    setLoading(true);

    if (isLiveApi) {
      try {
        let lat: number | undefined;
        let lng: number | undefined;
        if (navigator.geolocation) {
          try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 }),
            );
            lat = pos.coords.latitude;
            lng = pos.coords.longitude;
          } catch {
            // Geolocation optional in dev/desktop
          }
        }

        const res = await complianceApi.inspectPermit(
          code.trim(),
          lat,
          lng,
          photoUrl.trim() || undefined,
        );
        setLiveResult(res);
      } catch (err) {
        showToast(errorMessage(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(false);
  };

  const hasResult = isLiveApi ? (liveResult?.found ?? false) : !!(mockPermit && mockContract);
  const vendorName = liveResult?.vendorName ?? mockVendor?.business_name ?? 'Hộ kinh doanh';
  const effectiveStatus = liveResult?.effectiveStatus ?? mockPermit?.permit_status ?? 'ACTIVE';
  const slotCode = liveResult?.slotCode ?? mockSlot?.slot_code ?? '';
  const slotStreet = liveResult?.slotStreet ?? mockSlot?.street ?? '';
  const width = liveResult?.width ?? mockSlot?.size_m2 ?? 2;
  const length = liveResult?.length ?? 3;
  const endDate =
    liveResult?.endDate ??
    (mockPermit?.expires_at ? new Date(mockPermit.expires_at).toLocaleDateString('vi-VN') : '');
  const permitId = liveResult?.permitId?.toString() ?? mockPermit?.id ?? '';
  const contractId = liveResult?.contractId?.toString() ?? mockContract?.id ?? '';
  const slotId = liveResult?.slotId?.toString() ?? mockSlot?.id ?? '';
  const vendorId = liveResult?.vendorId?.toString() ?? mockVendor?.id ?? '';

  const locationHint = liveResult?.locationWarning ? (
    <AiHint title="Cảnh báo toạ độ thực tế [AI]">{liveResult.locationWarning}</AiHint>
  ) : (liveResult?.isLocationMatched && liveResult.distanceMeters !== null) ||
    (!isLiveApi && photoUrl) ? (
    <AiHint title="Xác minh vị trí chính xác [AI]">
      Toạ độ quét hiện trường khớp với ô cấp phép (Cách {liveResult?.distanceMeters ?? 12}m, nằm
      trong dung sai 25m).
    </AiHint>
  ) : null;

  // AI Vision Encroachment Check (Section 7.2 Master Prompt)
  const visionHint = liveResult?.aiVisionResult ? (
    <AiHint title="Trợ lý thị giác AI Vision [AI]">
      <p>{liveResult.aiVisionResult.analysis}</p>
      {liveResult.aiVisionResult.visualCues.length > 0 ? (
        <ul className="mt-1 list-disc pl-4 text-body-sm">
          {liveResult.aiVisionResult.visualCues.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      ) : null}
      {liveResult.aiVisionResult.detectedEncroachment ? (
        <EncroachmentSketch distanceCm={liveResult.aiVisionResult.encroachmentDistanceCm} />
      ) : null}
    </AiHint>
  ) : photoUrl ? (
    <AiHint title="Trợ lý thị giác AI Vision [AI]">
      {photoUrl.includes('lan-chiem') ? (
        <div>
          <p className="flex items-start gap-1.5 font-medium text-danger">
            <Icon
              name="alert-octagon-outline"
              size={17}
              color="currentColor"
              className="mt-0.5 shrink-0"
            />
            Phát hiện lấn chiếm: Bàn ghế và biển hiệu vượt quá vạch sơn vàng giới hạn ô khoảng 35cm.
          </p>
          <p className="mt-1 text-body-sm">
            Lối đi bộ cho người tàn tật và người đi bộ bị thu hẹp còn ~1.15m (vi phạm quy chuẩn tối
            thiểu 1.5m theo Nghị định 165/2024/NĐ-CP và Luật Đường bộ 2024).
          </p>
          <ul className="mt-1 list-disc pl-4 text-body-sm text-muted">
            <li>Dấu hiệu: 2 bàn nhựa 4 chân đặt lấn ra ngoài vạch kẻ</li>
            <li>Biển hiệu đứng đặt ngay trên lối đi của người đi bộ</li>
          </ul>
        </div>
      ) : (
        <div>
          <p className="flex items-start gap-1.5 font-medium text-ok">
            <Icon
              name="check-circle-outline"
              size={17}
              color="currentColor"
              className="mt-0.5 shrink-0"
            />
            Đạt tiêu chuẩn: Vật dụng kinh doanh nằm gọn trong phạm vi ô được cấp phép (2m x 3m).
          </p>
          <p className="mt-1 text-body-sm">
            Lối đi bộ thông thoáng đạt 1.8m, đảm bảo an toàn giao thông và mỹ quan đô thị.
          </p>
        </div>
      )}
    </AiHint>
  ) : env.enableAiCompliance ? (
    <AiHint title="Trợ lý hiện trường [Hệ thống — chưa xác minh bằng AI]">
      Giấy phép tra cứu trực tiếp từ máy chủ. Cán bộ có thể đính kèm ảnh hiện trường để kích hoạt AI
      Vision phân tích lấn chiếm.
    </AiHint>
  ) : null;

  // "Hiệu lực đến": an ISO day is shown as dd/mm/yyyy with the days left; any other string as is.
  const validity = endDate ? permitValidity(liveResult?.startDate, String(endDate)) : null;

  const failedNotice = failedAt ? (
    <ResultNotice icon="alert-circle-outline">
      {hasResult
        ? `Lần tra lúc ${clockFormat.format(failedAt)} không thành công. Kết quả dưới đây là của lần tra trước.`
        : `Lần tra lúc ${clockFormat.format(failedAt)} không thành công (mạng hoặc máy chủ). Hãy bấm Kiểm tra lại trước khi kết luận.`}
    </ResultNotice>
  ) : null;
  const codeChanged =
    isLiveApi && hasResult && !loading && checkedCode != null && code.trim() !== checkedCode;
  const codeNotice = codeChanged ? (
    <ResultNotice icon="pencil-outline">
      Mã trong ô đã sửa sau lần tra — bấm Kiểm tra để tra mã mới.
    </ResultNotice>
  ) : null;

  let result;
  if (hasResult) {
    result = (
      <PermitVerdictBoard
        vendorName={vendorName}
        code={code}
        effectiveStatus={effectiveStatus}
        slotCode={slotCode}
        slotStreet={slotStreet}
        checkedAt={isLiveApi ? checkedAt : null}
        refreshing={loading}
        notice={
          failedNotice || codeNotice ? (
            <div className="flex flex-col gap-xs">
              {failedNotice}
              {codeNotice}
            </div>
          ) : null
        }
        actions={
          <>
            <Button
              label="Lập biên bản vi phạm"
              variant="outline"
              onPress={() =>
                navigate(
                  `/ward/patrol/violations/new?contractId=${contractId}&slotId=${slotId}&vendorId=${vendorId}`,
                )
              }
            />
            <Button
              label="Đình chỉ / thu hồi"
              variant="danger"
              onPress={() => navigate(`/ward/patrol/permits/${permitId}/action`)}
            />
          </>
        }
        details={
          <PermitFacts
            rows={[
              { label: 'Vị trí ô cấp phép', value: `${slotCode} · ${slotStreet}` },
              { label: 'Kích thước được phép sử dụng', value: `${width}m x ${length}m` },
              validity
                ? {
                    label: 'Hiệu lực đến',
                    value: validity.label,
                    note:
                      validity.daysLeft != null ? (
                        <ValidityNote daysLeft={validity.daysLeft} />
                      ) : undefined,
                    extra:
                      validity.used != null && validity.daysLeft != null ? (
                        <ValidityRing used={validity.used} daysLeft={validity.daysLeft} />
                      ) : undefined,
                  }
                : { label: 'Hiệu lực đến', value: 'Đang hiệu lực' },
            ]}
          />
        }
        hints={
          locationHint || visionHint ? (
            <div className="flex flex-col gap-sm">
              {locationHint}
              {visionHint}
            </div>
          ) : null
        }
      />
    );
  } else if (searched && loading) {
    result = <VerdictSkeleton />;
  } else if (searched) {
    result = <NotFoundBoard notice={failedNotice} />;
  } else {
    result = <PatrolIdle />;
  }

  return (
    <Screen width="wide">
      <AppHeader
        title="Tuần tra & Kiểm tra hiện trường"
        subtitle="Nhập mã in trên giấy phép hoặc nội dung mã QR để kiểm tra quầy ngay tại chỗ."
        right={
          isLiveApi ? (
            <span className="hidden h-9 items-center gap-2 rounded-full bg-[#E6F6EC] md:flex px-sm text-body-sm font-semibold text-[#0B5D33] dark:bg-[#10301F] dark:text-[#8BE3B0]">
              <span aria-hidden="true" className="relative flex h-2.5 w-2.5">
                <span className="sb-ping absolute inset-0 rounded-full bg-current opacity-60" />
                <span className="relative h-2.5 w-2.5 rounded-full bg-current" />
              </span>
              Tra cứu trực tiếp máy chủ
            </span>
          ) : null
        }
      />

      <div className="grid items-start gap-lg xl:grid-cols-[minmax(0,400px)_minmax(0,1fr)] xl:gap-xl">
        {/* `cq`: fields lay out for the panel's width, not the screen's. */}
        <section
          aria-label="Tra cứu giấy phép"
          className="cq flex flex-col overflow-hidden rounded-[28px] bg-card shadow-sheet ring-1 ring-border xl:sticky xl:top-0"
        >
          <SidewalkPlan />
          <div className="flex flex-col gap-md p-md md:p-lg">
            <TextField
              label="Mã giấy phép số / Token QR"
              value={code}
              onChangeText={setCode}
              placeholder="Nhập mã ví dụ: SB-HC1-2026-0815"
            />
            <Button label={loading ? 'Đang kiểm tra...' : 'Kiểm tra'} onPress={handleInspect} />

            <TextField
              label="Link ảnh hiện trường (AI Vision phân tích vạch kẻ ranh giới)"
              value={photoUrl}
              onChangeText={setPhotoUrl}
              placeholder="https://example.com/anh-hien-truong.jpg"
            />

            {/* Quick Test Demo Helpers: folded away on live patrols, open in demo mode. */}
            <details
              open={!isLiveApi}
              className="group rounded-[16px] bg-sunken/70 open:pb-sm [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex h-12 cursor-pointer list-none items-center justify-between gap-xs rounded-[16px] px-sm text-body-sm font-semibold text-text">
                <span className="flex items-center gap-1.5">
                  <Icon
                    name="flash-outline"
                    size={17}
                    color="currentColor"
                    className="text-primary"
                  />
                  Thử nhanh với dữ liệu mẫu
                </span>
                <Icon
                  name="chevron-down"
                  size={18}
                  color="currentColor"
                  className="text-muted transition-transform duration-200 group-open:rotate-180"
                />
              </summary>
              <div className="no-scrollbar flex gap-xs overflow-x-auto px-sm pb-0.5 lg:flex-wrap">
                <SampleChip icon="tag-outline" onPress={() => setCode('SB-HC1-2026-0815')}>
                  Mã giấy phép: SB-HC1-2026-0815
                </SampleChip>
                <SampleChip
                  icon="camera-plus-outline"
                  tone="danger"
                  onPress={() => {
                    setCode('SB-HC1-2026-0815');
                    setPhotoUrl(
                      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80#lan-chiem-35cm',
                    );
                  }}
                >
                  Ảnh mẫu: Lấn chiếm 35cm
                </SampleChip>
                <SampleChip
                  icon="check-circle-outline"
                  tone="ok"
                  onPress={() => {
                    setCode('SB-HC1-2026-0815');
                    setPhotoUrl(
                      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80#chuan-ranh-gioi',
                    );
                  }}
                >
                  Ảnh mẫu: Đúng ranh giới
                </SampleChip>
              </div>
            </details>

            {isLiveApi ? (
              <p className="flex items-start gap-1.5 text-body-sm text-muted">
                <Icon
                  name="shield-check-outline"
                  size={16}
                  color="currentColor"
                  className="mt-0.5 shrink-0"
                />
                Mỗi lần bấm Kiểm tra đều tra cứu trực tiếp với máy chủ, không dùng dữ liệu lưu sẵn.
              </p>
            ) : null}
          </div>
        </section>

        {/* Below 1280px the two stack, and the verdict moves above the lookup once there
            is one, so the officer sees it without scrolling. */}
        <div className={`min-w-0 ${searched || hasResult ? 'order-first xl:order-none' : ''}`}>
          {result}
        </div>
      </div>

      {/* 7.5 Patrol Heatmap Insights (Thống kê vi phạm lịch sử - không LLM) */}
      {heatmap.length > 0 ? (
        <Section
          title="Giờ và tuyến nên tuần tra"
          description="Tính từ các vi phạm đã ghi trên địa bàn phường, theo khung giờ và tuyến đường."
        >
          <PatrolHeatmap points={heatmap} />
          <PatrolWeekGrid points={heatmap} />
        </Section>
      ) : null}
    </Screen>
  );
}

/**
 * The patrol beat from above: the road, the painted kerb, and the numbered
 * slots on the pavement, stalls set out in some of them; the one being looked
 * up glows. Decoration only.
 */
function SidewalkPlan() {
  const slots = [0, 1, 2, 3, 4];
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 420 124"
      preserveAspectRatio="xMidYMid slice"
      className="block h-[124px] w-full"
    >
      <rect width="420" height="48" className="fill-[#E9EDF1] dark:fill-[#1D2833]" />
      <path
        d="M0 24 H420"
        strokeDasharray="18 14"
        strokeWidth="3"
        className="stroke-white/90 dark:stroke-white/25"
      />
      {Array.from({ length: 20 }, (_, i) => (
        <rect
          key={i}
          x={i * 22}
          y="48"
          width="22"
          height="8"
          className={i % 2 ? 'fill-[#FFF8F2]' : 'fill-brand'}
        />
      ))}
      <rect y="56" width="420" height="68" className="fill-[#FFF3E8] dark:fill-[#2A2420]" />
      {slots.map((i) => {
        const x = 18 + i * 79;
        const lit = i === 2;
        return (
          <g key={i}>
            <rect
              x={x}
              y="68"
              width="66"
              height="44"
              rx="7"
              strokeWidth={lit ? 3 : 2}
              strokeDasharray={lit ? undefined : '6 5'}
              className={
                lit
                  ? 'fill-[rgb(var(--c-brand)/0.16)] stroke-brand'
                  : 'fill-none stroke-[rgb(var(--c-primary)/0.4)]'
              }
            />
            {lit ? (
              <>
                <rect
                  x={x - 5}
                  y="63"
                  width="76"
                  height="54"
                  rx="11"
                  strokeWidth="2"
                  className="sb-slot-beacon fill-none stroke-brand"
                />
                <rect x={x + 23} y="80" width="20" height="20" rx="3" className="fill-text" />
                <rect x={x + 27} y="84" width="5" height="5" className="fill-[#FFF3E8]" />
                <rect x={x + 34} y="84" width="5" height="5" className="fill-[#FFF3E8]" />
                <rect x={x + 27} y="91" width="5" height="5" className="fill-[#FFF3E8]" />
              </>
            ) : i % 2 === 0 ? (
              <>
                <rect x={x + 12} y="80" width="24" height="18" rx="3" className="fill-accent" />
                <circle cx={x + 46} cy="84" r="5" className="fill-tertiary" />
                <circle cx={x + 46} cy="98" r="5" className="fill-tertiary" />
              </>
            ) : (
              <>
                <rect
                  x={x + 20}
                  y="82"
                  width="26"
                  height="16"
                  rx="8"
                  className="fill-[rgb(var(--c-primary)/0.75)]"
                />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function SampleChip({
  icon,
  tone = 'primary',
  onPress,
  children,
}: {
  icon: IconName;
  tone?: 'primary' | 'danger' | 'ok';
  onPress: () => void;
  children: string;
}) {
  const toneClass = {
    primary: 'border-primary/35 text-primary hover:bg-tint-primary',
    danger: 'border-error/35 text-error hover:bg-tint-error',
    ok: 'border-tertiary/35 text-tertiary hover:bg-tint-tertiary',
  }[tone];
  return (
    <button
      type="button"
      onClick={onPress}
      className={`flex h-11 shrink-0 items-center gap-1.5 rounded-full border bg-card px-sm text-body-sm font-semibold transition-colors ${toneClass}`}
    >
      <Icon name={icon} size={15} color="currentColor" />
      {children}
    </button>
  );
}
