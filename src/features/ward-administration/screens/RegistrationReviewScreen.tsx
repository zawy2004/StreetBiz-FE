import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, Card, Divider, ListRow } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, Section, StickyActions } from '@/components/layout';
import { AiHint, StatusChip } from '@/components/status';
import { ErrorState, showToast } from '@/components/feedback';
import { env, isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import { complianceApi, type WardEnrollmentDetail } from '../ward-api';

export function RegistrationReviewScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Mock DB fallback
  const mockRegistration = useMockDb((s) => s.registrations.find((r) => r.id === id));
  const approveMock = useMockDb((s) => s.approveRegistration);
  const rejectMock = useMockDb((s) => s.rejectRegistration);
  const requestEvidenceMock = useMockDb((s) => s.requestRegistrationEvidence);

  const [liveDetail, setLiveDetail] = useState<WardEnrollmentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  // AI Check State (Live or Mock)
  const [customAiCheck, setCustomAiCheck] = useState<WardEnrollmentDetail['aiCheck']>(null);
  const [ocrRunning, setOcrRunning] = useState(false);

  useEffect(() => {
    if (!isLiveApi || !id) return;
    setLoading(true);
    complianceApi
      .getEnrollment(id)
      .then(setLiveDetail)
      .catch((err) => {
        console.warn('Could not load live enrollment, falling back to mock:', err);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // All hooks above this line must run on every render -- react-hooks/rules-of-hooks
  // forbids calling useState/useMemo conditionally, so nothing hook-shaped may follow
  // the early return below. A prior version of this screen violated that.
  const fallbackIdNumber = liveDetail?.idNumber ?? mockRegistration?.id_number ?? '';
  const defaultMockAiCheck = useMemo(() => {
    if (isLiveApi) return null;
    const isLowConfidence = id === 'REG-002';
    return {
      matchPercentage: isLowConfidence ? 82 : 96,
      isMatch: !isLowConfidence,
      needsManualVerification: isLowConfidence,
      summary: isLowConfidence
        ? '[Mô phỏng] Phát hiện sai lệch khi đối chiếu CCCD (độ khớp 82%). Độ tin cậy thấp hơn ngưỡng 85%.'
        : `[Mô phỏng] Đã trích xuất và đối chiếu CCCD: Số CCCD ${fallbackIdNumber || '048099000111'}, khớp 96% với thông tin khai báo.`,
      discrepancies: isLowConfidence
        ? ['Ảnh chụp CCCD hơi mờ ở cụm số định danh', 'Cần cán bộ đối chiếu lại số CCCD tự khai: 048099000222']
        : [],
      isAiGenerated: false,
    };
  }, [id, fallbackIdNumber]);

  if (!mockRegistration && !liveDetail && !loading) {
    return <ErrorState message="Không tìm thấy hồ sơ đăng ký điểm kinh doanh vỉa hè." />;
  }

  const displayName = liveDetail?.displayName ?? mockRegistration?.business_name ?? 'Điểm kinh doanh';
  const ownerName = liveDetail?.ownerName ?? mockRegistration?.owner_name ?? '';
  const idNumber = fallbackIdNumber;
  const vendorType = liveDetail?.vendorType ?? mockRegistration?.vendor_type ?? 'ITINERANT';
  const status = liveDetail?.status ?? mockRegistration?.registration_status ?? 'SUBMITTED';
  const address = liveDetail?.address ?? mockRegistration?.address ?? '';
  const fastTrack = liveDetail?.fastTrack ?? mockRegistration?.fast_track ?? false;

  const aiCheck = customAiCheck ?? liveDetail?.aiCheck ?? defaultMockAiCheck;
  const evidenceList = liveDetail?.evidence ?? mockRegistration?.evidence.map((e, idx) => ({
    evidenceId: idx + 1,
    type: e.type,
    label: e.label,
    fileUrl: e.uri,
  })) ?? [];

  const handleRunOcr = async () => {
    if (!id) return;
    setOcrRunning(true);
    try {
      if (isLiveApi) {
        // Server-authoritative: loads this registration's own evidence + checks biometric
        // consent server-side. The response already has the exact shape aiCheck expects.
        const res = await complianceApi.aiDocumentExtract(id);
        setCustomAiCheck(res);
        showToast(
          res.isAiGenerated ? 'Đã đối soát CCCD thành công [AI]' : (res.summary ?? 'Không thể đối soát CCCD'),
        );
      } else {
        // Mock demo delay -- clearly NOT a real AI call, must not claim "Gemini Vision".
        await new Promise((r) => setTimeout(r, 1200));
        setCustomAiCheck({
          matchPercentage: 94,
          isMatch: true,
          needsManualVerification: false,
          summary: `[Mô phỏng] Số CCCD ${idNumber || '048099000222'}, Họ tên: ${ownerName}. Khớp 94% thông tin khai báo.`,
          discrepancies: [],
          isAiGenerated: false,
        });
        showToast('Đã quét và đối soát CCCD (chế độ mô phỏng, không gọi AI thật)');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Lỗi bóc tách ảnh CCCD');
    } finally {
      setOcrRunning(false);
    }
  };

  const act = async (action: 'APPROVE' | 'REJECT' | 'MORE_INFO') => {
    if ((action === 'REJECT' || action === 'MORE_INFO') && !note.trim()) {
      showToast('Vui lòng nhập lý do quyết định');
      return;
    }

    if (isLiveApi && id) {
      try {
        const decisionText = action === 'MORE_INFO' ? 'MORE_INFORMATION_REQUIRED' : action;
        await complianceApi.decideEnrollment(
          id,
          decisionText,
          note.trim() || 'Hồ sơ đủ điều kiện thực địa trật tự đô thị',
          status,
        );
        showToast(
          action === 'APPROVE'
            ? 'Đã xác nhận đủ điều kiện điểm bán vỉa hè'
            : action === 'MORE_INFO'
              ? 'Đã yêu cầu bổ sung giấy tờ'
              : 'Đã từ chối hồ sơ',
        );
        navigate(-1);
        return;
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Lỗi xử lý hồ sơ');
        return;
      }
    }

    // Mock fallback
    if (mockRegistration) {
      if (action === 'APPROVE') approveMock(mockRegistration.id);
      if (action === 'REJECT') rejectMock(mockRegistration.id, note || 'Hồ sơ chưa hợp lệ');
      if (action === 'MORE_INFO')
        requestEvidenceMock(mockRegistration.id, note || 'Vui lòng bổ sung giấy tờ rõ nét hơn');
      showToast('Đã cập nhật hồ sơ (chế độ demo)');
      navigate(-1);
    }
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <div className="flex-1">
            <Button label="Yêu cầu bổ sung" variant="outline" onPress={() => act('MORE_INFO')} />
          </div>
          <div className="flex-1">
            <Button label="Từ chối" variant="danger" onPress={() => act('REJECT')} />
          </div>
          <div className="flex-1">
            <Button label="Duyệt điểm bán" variant="approve" onPress={() => act('APPROVE')} />
          </div>
        </StickyActions>
      }
    >
      <AppHeader
        title={displayName}
        subtitle="Thẩm định điểm kinh doanh vỉa hè (WARD-04/05/06)"
        back
      />
      <div className="flex flex-row flex-wrap items-center justify-between gap-xs">
        <div className="flex flex-row items-center gap-xs">
          <StatusChip code={status} />
          {fastTrack ? <StatusChip label="Ưu tiên xét nhanh" tone="ok" /> : null}
        </div>
        <Button
          label={ocrRunning ? 'Đang đọc CCCD...' : '🔍 Quét lại CCCD [AI]'}
          variant="outline"
          fullWidth={false}
          onPress={handleRunOcr}
        />
      </div>

      {/* AI OCR Citizen ID & Profile Check (Section 7.1 Master Prompt) */}
      {aiCheck ? (
        <div className="mt-sm space-y-2">
          {aiCheck.needsManualVerification || aiCheck.matchPercentage < 85 ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700/60 dark:bg-amber-950/30">
              <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300">
                <span>⚠️</span>
                <span>[AI] Cần cán bộ kiểm tra kỹ đối chiếu CCCD gốc</span>
              </div>
              <p className="mt-1 text-body-sm text-amber-900/90 dark:text-amber-200/90">
                Độ tin cậy trích xuất OCR ({aiCheck.matchPercentage}%) thấp hơn ngưỡng 85% hoặc phát hiện sai lệch. Cán bộ vui lòng trực tiếp đối chiếu ảnh CCCD bên dưới với thông tin tự khai.
              </p>
            </div>
          ) : null}

          <AiHint title="Trợ lý bóc tách & đối chiếu CCCD [AI]">
            <p>{aiCheck.summary}</p>
            {aiCheck.discrepancies.length > 0 ? (
              <ul className="mt-1 list-disc pl-4 text-body-sm text-danger">
                {aiCheck.discrepancies.map((d: string, i: number) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            ) : null}
          </AiHint>
        </div>
      ) : env.enableAiCompliance ? (
        <AiHint title="Đối chiếu dữ liệu [Hệ thống — chưa xác minh bằng AI]">
          Thông tin số CCCD và địa chỉ khai báo khớp với tiêu chuẩn điểm kinh doanh vỉa hè theo quy định địa phương.
        </AiHint>
      ) : null}

      <Section title="Thông tin điểm kinh doanh vỉa hè">
        <Card padded={false}>
          <div className="px-md">
            <ListRow title="Chủ hộ kinh doanh" subtitle={ownerName} />
            <Divider />
            <ListRow
              title="Số CCCD / Định danh thật"
              subtitle={idNumber ? `${idNumber} (CCCD 12 số)` : 'Chưa có thông tin CCCD'}
            />
            <Divider />
            <ListRow
              title="Loại hình kinh doanh"
              subtitle={
                vendorType === 'FIXED_STOREFRONT'
                  ? 'Cửa hàng cố định (Kê khai vỉa hè liền kề)'
                  : 'Bán hàng lưu động (Đăng ký vị trí vỉa hè mở)'
              }
            />
            <Divider />
            <ListRow title="Địa chỉ kinh doanh / Điểm bán" subtitle={address} />
          </div>
        </Card>
      </Section>

      <Section title="Giấy tờ minh chứng (Ảnh CCCD & Giấy phép)">
        <div className="flex flex-row flex-wrap gap-sm">
          {evidenceList.map((ev) => (
            <div key={ev.evidenceId || ev.type} className="flex flex-col items-center gap-1">
              {ev.fileUrl ? (
                <a href={ev.fileUrl} target="_blank" rel="noreferrer">
                  <img
                    src={ev.fileUrl}
                    alt={ev.label}
                    className="h-28 w-28 rounded-lg border border-border object-cover transition-transform hover:scale-105"
                  />
                </a>
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-lg border border-dashed border-border bg-card text-body-xs text-muted">
                  Chưa có ảnh
                </div>
              )}
              <span className="max-w-[112px] truncate text-center text-body-sm text-muted">
                {ev.label}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Căn cứ pháp lý thẩm quyền cấp phường">
        <Card>
          <p className="text-body-sm text-muted">
            * Căn cứ Nghị định 01/2021/NĐ-CP: Thủ tục này nhằm xác nhận điểm kinh doanh bảo đảm các điều kiện về trật tự đô thị, an toàn giao thông và vệ sinh môi trường trên địa bàn phường. Thủ tục này <strong>không thay thế</strong> Giấy chứng nhận Đăng ký kinh doanh Hộ kinh doanh do UBND cấp Quận/Huyện cấp.
          </p>
        </Card>
      </Section>

      <Section title="Ghi chú phản hồi (bắt buộc nếu từ chối / yêu cầu bổ sung)">
        <TextField
          value={note}
          onChangeText={setNote}
          multiline
          placeholder="Nhập lý do từ chối hoặc nội dung hồ sơ cần bổ sung..."
        />
      </Section>
    </Screen>
  );
}
