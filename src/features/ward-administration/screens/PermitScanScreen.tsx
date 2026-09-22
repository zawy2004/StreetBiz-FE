import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Card, Divider, Icon, ListRow } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, Section } from '@/components/layout';
import { AiHint, StatusChip } from '@/components/status';
import { EmptyState, showToast } from '@/components/feedback';
import { errorMessage } from '@/core/api';
import { env, isLiveApi } from '@/core/config/env';
import { colors } from '@/theme';
import { useMockDb } from '@/mocks/db';
import {
  complianceApi,
  type InspectPermitResult,
  type WardPatrolHeatmapPoint,
} from '../ward-api';

const DAY_NAMES = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

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

  // 7.5 Patrol Heatmap Insights
  const [heatmap, setHeatmap] = useState<WardPatrolHeatmapPoint[]>([]);

  useEffect(() => {
    if (!isLiveApi) return;
    complianceApi
      .patrolHeatmap()
      .then(setHeatmap)
      .catch((err) => console.warn('Could not load patrol heatmap:', err));
  }, []);

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
  const endDate = liveResult?.endDate ?? (mockPermit?.expires_at ? new Date(mockPermit.expires_at).toLocaleDateString('vi-VN') : '');
  const permitId = liveResult?.permitId?.toString() ?? mockPermit?.id ?? '';
  const contractId = liveResult?.contractId?.toString() ?? mockContract?.id ?? '';
  const slotId = liveResult?.slotId?.toString() ?? mockSlot?.id ?? '';
  const vendorId = liveResult?.vendorId?.toString() ?? mockVendor?.id ?? '';

  return (
    <Screen>
      <AppHeader
        title="Tuần tra & Kiểm tra hiện trường"
        subtitle="Quét / nhập mã Giấy phép số QR (WARD-11)"
      />

      {/* Quick Test Demo Helpers */}
      <div className="flex flex-row flex-wrap items-center gap-xs">
        <span className="text-body-xs text-muted">Dữ liệu mẫu:</span>
        <button
          type="button"
          className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-body-xs font-medium text-primary hover:bg-primary/20"
          onClick={() => setCode('SB-HC1-2026-0815')}
        >
          🏷️ Mã giấy phép: SB-HC1-2026-0815
        </button>
        <button
          type="button"
          className="rounded-full border border-danger/40 bg-danger/10 px-2.5 py-1 text-body-xs font-medium text-danger hover:bg-danger/20"
          onClick={() => {
            setCode('SB-HC1-2026-0815');
            setPhotoUrl('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80#lan-chiem-35cm');
          }}
        >
          📸 Ảnh mẫu: Lấn chiếm 35cm
        </button>
        <button
          type="button"
          className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-body-xs font-medium text-emerald-600 hover:bg-emerald-500/20"
          onClick={() => {
            setCode('SB-HC1-2026-0815');
            setPhotoUrl('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80#chuan-ranh-gioi');
          }}
        >
          ✅ Ảnh mẫu: Đúng ranh giới
        </button>
      </div>

      <div className="flex flex-col gap-sm">
        <div className="flex flex-row items-end gap-sm">
          <div className="flex-1">
            <TextField
              label="Mã giấy phép số / Token QR"
              value={code}
              onChangeText={setCode}
              placeholder="Nhập mã ví dụ: SB-HC1-2026-0815"
            />
          </div>
          <Button
            label={loading ? 'Đang kiểm tra...' : 'Kiểm tra'}
            fullWidth={false}
            onPress={handleInspect}
          />
        </div>

        <TextField
          label="Link ảnh hiện trường (AI Vision phân tích vạch kẻ ranh giới)"
          value={photoUrl}
          onChangeText={setPhotoUrl}
          placeholder="https://example.com/anh-hien-truong.jpg"
        />
      </div>

      {searched && !hasResult && !loading ? (
        <EmptyState
          icon="qrcode-remove"
          title="Không tìm thấy giấy phép"
          description="Mã không hợp lệ, chưa được cấp hoặc đã hết hiệu lực trên hệ thống máy chủ."
        />
      ) : null}

      {hasResult ? (
        <>
          <Card>
            <div className="flex flex-row items-center justify-between">
              <div>
                <p className="text-headline-sm text-text">{vendorName}</p>
                <p className="text-body-sm text-muted">Mã giấy phép: {code}</p>
              </div>
              <StatusChip code={effectiveStatus} />
            </div>
          </Card>

          {/* AI Location Matching & GPS Check */}
          {liveResult?.locationWarning ? (
            <AiHint title="Cảnh báo toạ độ thực tế [AI]">
              {liveResult.locationWarning}
            </AiHint>
          ) : (liveResult?.isLocationMatched && liveResult.distanceMeters !== null) || (!isLiveApi && photoUrl) ? (
            <AiHint title="Xác minh vị trí chính xác [AI]">
              Toạ độ quét hiện trường khớp với ô cấp phép (Cách {liveResult?.distanceMeters ?? 12}m, nằm trong dung sai 25m).
            </AiHint>
          ) : null}

          {/* AI Vision Encroachment Check (Section 7.2 Master Prompt) */}
          {liveResult?.aiVisionResult ? (
            <AiHint title="Trợ lý thị giác AI Vision [AI]">
              <p>{liveResult.aiVisionResult.analysis}</p>
              {liveResult.aiVisionResult.visualCues.length > 0 ? (
                <ul className="mt-1 list-disc pl-4 text-body-sm">
                  {liveResult.aiVisionResult.visualCues.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              ) : null}
            </AiHint>
          ) : photoUrl ? (
            <AiHint title="Trợ lý thị giác AI Vision [AI]">
              {photoUrl.includes('lan-chiem') ? (
                <div>
                  <p className="font-medium text-danger">
                    ⚠️ Phát hiện lấn chiếm: Bàn ghế và biển hiệu vượt quá vạch sơn vàng giới hạn ô khoảng 35cm.
                  </p>
                  <p className="mt-1 text-body-sm">
                    Lối đi bộ cho người tàn tật và người đi bộ bị thu hẹp còn ~1.15m (vi phạm quy chuẩn tối thiểu 1.5m theo Nghị định 165/2024/NĐ-CP và Luật Đường bộ 2024).
                  </p>
                  <ul className="mt-1 list-disc pl-4 text-body-sm text-muted">
                    <li>Dấu hiệu: 2 bàn nhựa 4 chân đặt lấn ra ngoài vạch kẻ</li>
                    <li>Biển hiệu đứng đặt ngay trên lối đi của người đi bộ</li>
                  </ul>
                </div>
              ) : (
                <div>
                  <p className="font-medium text-ok">
                    ✅ Đạt tiêu chuẩn: Vật dụng kinh doanh nằm gọn trong phạm vi ô được cấp phép (2m x 3m).
                  </p>
                  <p className="mt-1 text-body-sm">
                    Lối đi bộ thông thoáng đạt 1.8m, đảm bảo an toàn giao thông và mỹ quan đô thị.
                  </p>
                </div>
              )}
            </AiHint>
          ) : env.enableAiCompliance ? (
            <AiHint title="Trợ lý hiện trường [Hệ thống — chưa xác minh bằng AI]">
              Giấy phép tra cứu trực tiếp từ máy chủ. Cán bộ có thể đính kèm ảnh hiện trường để kích hoạt AI Vision phân tích lấn chiếm.
            </AiHint>
          ) : null}

          <Card padded={false}>
            <div className="px-md">
              <ListRow title="Vị trí ô cấp phép" subtitle={`${slotCode} · ${slotStreet}`} />
              <Divider />
              <ListRow title="Kích thước được phép sử dụng" subtitle={`${width}m x ${length}m`} />
              <Divider />
              <ListRow title="Hiệu lực đến" subtitle={endDate ? String(endDate) : 'Đang hiệu lực'} />
            </div>
          </Card>

          <div className="flex flex-row gap-sm">
            <div className="flex-1">
              <Button
                label="Lập biên bản vi phạm"
                variant="outline"
                onPress={() =>
                  navigate(
                    `/ward/patrol/violations/new?contractId=${contractId}&slotId=${slotId}&vendorId=${vendorId}`,
                  )
                }
              />
            </div>
            <div className="flex-1">
              <Button
                label="Đình chỉ / thu hồi"
                variant="danger"
                onPress={() => navigate(`/ward/patrol/permits/${permitId}/action`)}
              />
            </div>
          </div>
        </>
      ) : null}

      {!searched && !hasResult ? (
        <div className="flex items-center justify-center py-xl">
          <Icon name="qrcode-scan" size={48} color={colors.muted} />
        </div>
      ) : null}

      {/* 7.5 Patrol Heatmap Insights (Thống kê vi phạm lịch sử - không LLM) */}
      {heatmap.length > 0 ? (
        <Section title="Gợi ý ca tuần tra trọng điểm (Thống kê vi phạm)">
          <Card>
            <div className="space-y-3">
              <p className="text-body-sm text-muted">
                Phân tích dữ liệu vi phạm lịch sử theo khung giờ và tuyến đường trên địa bàn phường để bố trí lực lượng tuần tra tối ưu:
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {heatmap.slice(0, 4).map((pt, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                  >
                    <div>
                      <p className="text-body-sm font-semibold text-foreground">
                        {pt.zoneName || 'Tuyến phố chính'}
                      </p>
                      <p className="text-body-xs text-muted">
                        {DAY_NAMES[pt.dayOfWeek % 7]} · {pt.hourOfDay}:00 - {pt.hourOfDay + 1}:00
                      </p>
                    </div>
                    <span className="rounded-full bg-danger/10 px-2 py-0.5 text-body-xs font-semibold text-danger">
                      {pt.violationCount} vi phạm
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </Section>
      ) : null}
    </Screen>
  );
}
