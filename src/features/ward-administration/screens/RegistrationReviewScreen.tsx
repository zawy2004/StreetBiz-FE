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
  // BR-41 KYC gate: officer's manual identity-verification confirmation.
  const [identityNote, setIdentityNote] = useState('');
  const [confirmingIdentity, setConfirmingIdentity] = useState(false);

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

  // BR-41: in live mode, APPROVE is refused server-side until confirmIdentity has been called
  // (AI-OCR alone never satisfies this -- it only reads/self-compares a photo). Mock mode has
  // no such server gate, so the button stays enabled there to keep the demo unblocked.
  const identityVerified = !isLiveApi || (liveDetail?.identityVerified ?? false);
  const ownerProfile = liveDetail?.ownerProfile;
  const businessProfile = liveDetail?.businessProfile;
  const householdMembers = liveDetail?.householdMembers ?? [];
  const kycChecks = liveDetail?.kycChecks ?? [];

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

  const handleConfirmIdentity = async () => {
    if (!id || !identityNote.trim()) {
      showToast('Vui lòng ghi chú ngắn gọn cách đối chiếu CCCD trước khi xác nhận.');
      return;
    }
    setConfirmingIdentity(true);
    try {
      if (isLiveApi) {
        const updated = await complianceApi.confirmIdentity(id, identityNote.trim());
        setLiveDetail(updated);
        showToast('Đã ghi nhận xác nhận đối chiếu CCCD thủ công.');
      } else {
        showToast('Đã ghi nhận xác nhận (chế độ demo, không có gate phía máy chủ).');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Lỗi xác nhận đối chiếu CCCD');
    } finally {
      setConfirmingIdentity(false);
    }
  };

  const act = async (action: 'APPROVE' | 'REJECT' | 'MORE_INFO') => {
    if ((action === 'REJECT' || action === 'MORE_INFO') && !note.trim()) {
      showToast('Vui lòng nhập lý do quyết định');
      return;
    }
    if (action === 'APPROVE' && !identityVerified) {
      showToast('Cán bộ phải xác nhận đã đối chiếu CCCD thủ công trước khi duyệt hồ sơ.');
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
            <Button
              label={identityVerified ? 'Duyệt điểm bán' : 'Duyệt (cần xác nhận CCCD trước)'}
              variant="approve"
              disabled={!identityVerified}
              onPress={() => act('APPROVE')}
            />
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

      {kycChecks.length > 0 ? (
        <Section title="Kết quả eKYC hộ kinh doanh đã thực hiện (FPT.AI)">
          <Card padded={false}>
            <div className="px-md">
              {kycChecks.map((check, idx) => (
                <div key={check.checkType}>
                  {idx > 0 ? <Divider /> : null}
                  <ListRow
                    title={check.checkType === 'FACE_MATCH' ? 'Đối chiếu khuôn mặt ↔ ảnh CCCD' : 'Đọc dữ liệu CCCD (OCR)'}
                    subtitle={
                      check.checkType === 'FACE_MATCH'
                        ? `${check.isMatch ? '✅ Khớp' : '⚠️ Chưa khớp'} · độ tương đồng ${check.similarityPercent ?? 0}% (ngưỡng 80%)`
                        : `Độ tin cậy ${check.confidencePercent ?? 0}%`
                    }
                  />
                  {check.warnings ? (
                    <p className="pb-sm text-body-sm text-danger">{check.warnings}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
          <p className="mt-1 text-body-sm text-muted">
            Đây là kết quả do máy chủ ghi nhận khi hộ kinh doanh nộp hồ sơ. Khớp khuôn mặt chỉ
            chứng minh hai ảnh cùng một người — <strong>không</strong> chứng minh CCCD là thật hay
            có trong Cơ sở dữ liệu quốc gia về dân cư.
          </p>
        </Section>
      ) : null}

      <Section title="Xác minh danh tính (bắt buộc trước khi duyệt — BR-41)">
        <Card>
          {identityVerified && liveDetail?.identityVerifiedAt ? (
            <p className="text-body-sm text-tertiary">
              ✅ Đã xác nhận lúc {new Date(liveDetail.identityVerifiedAt).toLocaleString('vi-VN')}
              {liveDetail.identityVerificationNote ? ` — "${liveDetail.identityVerificationNote}"` : ''}
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-body-sm text-muted">
                AI ở trên chỉ đọc và tự đối chiếu ảnh CCCD, <strong>không tra cứu Cơ sở dữ liệu quốc gia về dân cư</strong> nên không thể xác minh giấy tờ là thật. Cán bộ phải trực tiếp đối chiếu ảnh/CCCD gốc với người nộp hồ sơ rồi xác nhận bên dưới trước khi được phép Duyệt.
              </p>
              <TextField
                value={identityNote}
                onChangeText={setIdentityNote}
                placeholder="VD: Đã đối chiếu trực tiếp tại UBND phường ngày ..., khớp CCCD gốc."
              />
              <Button
                label={confirmingIdentity ? 'Đang xác nhận...' : 'Xác nhận đã đối chiếu CCCD'}
                variant="outline"
                loading={confirmingIdentity}
                onPress={handleConfirmIdentity}
              />
            </div>
          )}
        </Card>
      </Section>

      <Section title="Chủ hộ kinh doanh (Mẫu số 01 Phụ lục II, TT 68/2025/TT-BTC)">
        <Card padded={false}>
          <div className="px-md">
            <ListRow
              title="Ngày sinh / Giới tính"
              subtitle={`${ownerProfile?.dateOfBirth ?? 'Chưa cập nhật'} · ${ownerProfile?.gender ?? '—'}`}
            />
            <Divider />
            <ListRow
              title="Dân tộc / Quốc tịch"
              subtitle={`${ownerProfile?.ethnicity ?? '—'} · ${ownerProfile?.nationality ?? '—'}`}
            />
            <Divider />
            <ListRow
              title="Giấy tờ pháp lý"
              subtitle={
                ownerProfile?.idType
                  ? `${ownerProfile.idType} — cấp ${ownerProfile.idIssuedDate ?? '—'} tại ${ownerProfile.idIssuedPlace ?? '—'}`
                  : 'Chưa cập nhật'
              }
            />
            <Divider />
            <ListRow title="Địa chỉ thường trú" subtitle={ownerProfile?.permanentAddress ?? 'Chưa cập nhật'} />
            <Divider />
            <ListRow title="Địa chỉ liên lạc" subtitle={ownerProfile?.contactAddress ?? 'Chưa cập nhật'} />
          </div>
        </Card>
      </Section>

      <Section title="Ngành nghề, quy mô hộ kinh doanh">
        <Card padded={false}>
          <div className="px-md">
            <ListRow title="Ngành, nghề kinh doanh" subtitle={businessProfile?.businessLine ?? 'Chưa cập nhật'} />
            <Divider />
            <ListRow
              title="Vốn kinh doanh / Số lao động"
              subtitle={`${businessProfile?.capitalAmount != null ? `${businessProfile.capitalAmount.toLocaleString('vi-VN')} đ` : '—'} · ${businessProfile?.laborCount ?? '—'} lao động`}
            />
            <Divider />
            <ListRow title="Ngày dự kiến bắt đầu hoạt động" subtitle={businessProfile?.plannedStartDate ?? 'Chưa cập nhật'} />
            <Divider />
            <ListRow
              title="Cam kết an toàn thực phẩm"
              subtitle={
                liveDetail?.foodSafetyCommitmentAt
                  ? `Đã cam kết lúc ${new Date(liveDetail.foodSafetyCommitmentAt).toLocaleString('vi-VN')}`
                  : 'Chưa cam kết'
              }
            />
          </div>
        </Card>
      </Section>

      {householdMembers.length > 0 ? (
        <Section title="Thành viên hộ gia đình cùng góp vốn">
          <Card padded={false}>
            <div className="px-md">
              {householdMembers.map((m, idx) => (
                <div key={idx}>
                  {idx > 0 ? <Divider /> : null}
                  <ListRow
                    title={m.fullName}
                    subtitle={`${m.relationshipToOwner ?? 'Thành viên'} · ${m.capitalContribution != null ? `${m.capitalContribution.toLocaleString('vi-VN')} đ` : 'Chưa khai vốn góp'}`}
                  />
                </div>
              ))}
            </div>
          </Card>
        </Section>
      ) : null}

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
            * Căn cứ Nghị định 168/2025/NĐ-CP (thay thế Nghị định 01/2021/NĐ-CP từ 01/07/2025) và mô hình chính quyền địa phương 2 cấp: thẩm quyền cấp Giấy chứng nhận đăng ký hộ kinh doanh nay thuộc <strong>Phòng Kinh tế / Phòng Kinh tế, Hạ tầng và Đô thị thuộc UBND cấp xã (phường)</strong> — không còn cấp quận/huyện. Thủ tục thẩm định điểm bán vỉa hè này (WARD-04/05/06) xác nhận điều kiện trật tự đô thị, an toàn giao thông và vệ sinh môi trường tại địa bàn phường; nó <strong>không thay thế</strong> Giấy chứng nhận đăng ký hộ kinh doanh — hộ kinh doanh vẫn phải đăng ký riêng theo Mẫu số 01 Phụ lục II, Thông tư 68/2025/TT-BTC.
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
