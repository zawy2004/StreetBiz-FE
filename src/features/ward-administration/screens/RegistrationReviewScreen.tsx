import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, Card, Divider, Icon, ListRow } from '@/components/common';
import { colors } from '@/theme';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, Section, StickyActions } from '@/components/layout';
import { AiHint, StatusChip } from '@/components/status';
import { ConfirmDialog, ErrorState, LoadingState, showToast } from '@/components/feedback';
import { EvidencePreview } from '@/features/business-registrations/components/EvidencePreview';
import { env, isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import { complianceApi, type WardEnrollmentDetail } from '../ward-api';

type Decision = 'APPROVE' | 'REJECT' | 'MORE_INFO';

const DECISION_COPY: Record<
  Decision,
  { title: string; description: string; confirm: string; variant: 'approve' | 'danger' | 'primary'; done: string }
> = {
  APPROVE: {
    title: 'Duyệt điểm bán này?',
    description: 'Hộ kinh doanh sẽ được thông báo và có thể thuê ô vỉa hè. Không thể đổi quyết định sau khi duyệt.',
    confirm: 'Duyệt điểm bán',
    variant: 'approve',
    done: 'Đã xác nhận đủ điều kiện điểm bán vỉa hè',
  },
  REJECT: {
    title: 'Từ chối hồ sơ này?',
    description: 'Hộ kinh doanh sẽ nhận được lý do từ chối và phải nộp hồ sơ mới.',
    confirm: 'Từ chối hồ sơ',
    variant: 'danger',
    done: 'Đã từ chối hồ sơ',
  },
  MORE_INFO: {
    title: 'Yêu cầu bổ sung giấy tờ?',
    description: 'Hộ kinh doanh sẽ nhận được nội dung cần bổ sung và có thể sửa hồ sơ rồi nộp lại.',
    confirm: 'Gửi yêu cầu',
    variant: 'primary',
    done: 'Đã yêu cầu bổ sung giấy tờ',
  },
};

/** Starting points for the written reason, which the server requires for every decision. */
const REASON_TEMPLATES: Record<Decision, string[]> = {
  APPROVE: ['Hồ sơ đủ điều kiện trật tự đô thị, an toàn giao thông và vệ sinh môi trường.'],
  REJECT: [
    'Thông tin khai báo không khớp với giấy tờ đính kèm.',
    'Vị trí kinh doanh không đáp ứng điều kiện trật tự đô thị.',
  ],
  MORE_INFO: ['Ảnh giấy tờ chưa rõ nét, vui lòng chụp lại.', 'Vui lòng bổ sung giấy phép kinh doanh còn hiệu lực.'],
};

export function RegistrationReviewScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Mock DB fallback
  const mockRegistration = useMockDb((s) => s.registrations.find((r) => r.id === id));
  const approveMock = useMockDb((s) => s.approveRegistration);
  const rejectMock = useMockDb((s) => s.rejectRegistration);
  const requestEvidenceMock = useMockDb((s) => s.requestRegistrationEvidence);

  const [liveDetail, setLiveDetail] = useState<WardEnrollmentDetail | null>(null);
  const [loading, setLoading] = useState(isLiveApi);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  // The decision waiting for the officer's confirmation, and whether it is being sent.
  const [pendingDecision, setPendingDecision] = useState<Decision | null>(null);
  const [deciding, setDeciding] = useState(false);
  const [claiming, setClaiming] = useState(false);
  // AI Check State (Live or Mock)
  const [customAiCheck, setCustomAiCheck] = useState<WardEnrollmentDetail['aiCheck']>(null);
  const [ocrRunning, setOcrRunning] = useState(false);
  // BR-41 KYC gate: officer's manual identity-verification confirmation.
  const [identityNote, setIdentityNote] = useState('');
  const [confirmingIdentity, setConfirmingIdentity] = useState(false);

  useEffect(() => {
    if (!isLiveApi || !id) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    complianceApi
      .getEnrollment(id)
      .then((detail) => {
        if (!cancelled) setLiveDetail(detail);
      })
      .catch((err) => {
        // A live outage must read as an outage, not quietly show demo data to an officer.
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Không tải được hồ sơ.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
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

  if (isLiveApi && loading && !liveDetail) {
    return <LoadingState label="Đang tải hồ sơ" />;
  }
  if (isLiveApi && !liveDetail) {
    return <ErrorState message={loadError ?? 'Không tìm thấy hồ sơ đăng ký điểm kinh doanh vỉa hè.'} />;
  }
  if (!isLiveApi && !mockRegistration) {
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
  // Only a file still open for review can be decided; the server enforces the same table.
  const canDecide = !isLiveApi || status === 'SUBMITTED' || status === 'UNDER_REVIEW';
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
          res.isAiGenerated ? 'Đã đối soát CCCD bằng AI. Kết quả chỉ để tham khảo.' : (res.summary ?? 'Không thể đối soát CCCD'),
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

  // Step 1: validate, then ask the officer to confirm. Nothing is sent yet.
  const requestDecision = (action: Decision) => {
    if (!note.trim()) {
      showToast('Vui lòng nhập lý do quyết định để gửi kèm cho hộ kinh doanh.');
      return;
    }
    if (action === 'APPROVE' && !identityVerified) {
      showToast('Cán bộ phải xác nhận đã đối chiếu CCCD thủ công trước khi duyệt hồ sơ.');
      return;
    }
    setPendingDecision(action);
  };

  // Step 2: the confirmed decision. The dialog stays open and locked while it is in flight.
  const sendDecision = async () => {
    const action = pendingDecision;
    if (!action || deciding) return;
    setDeciding(true);
    try {
      if (isLiveApi && id) {
        await complianceApi.decideEnrollment(
          id,
          action === 'MORE_INFO' ? 'MORE_INFORMATION_REQUIRED' : action,
          note.trim(),
          status,
        );
        showToast(DECISION_COPY[action].done);
        navigate(-1);
        return;
      }

      // Demo mode
      if (mockRegistration) {
        if (action === 'APPROVE') approveMock(mockRegistration.id);
        if (action === 'REJECT') rejectMock(mockRegistration.id, note.trim());
        if (action === 'MORE_INFO') requestEvidenceMock(mockRegistration.id, note.trim());
        showToast('Đã cập nhật hồ sơ (chế độ demo)');
        navigate(-1);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Lỗi xử lý hồ sơ');
      setPendingDecision(null);
    } finally {
      setDeciding(false);
    }
  };

  const claim = async () => {
    if (!id || claiming) return;
    setClaiming(true);
    try {
      setLiveDetail(await complianceApi.claimEnrollment(id));
      showToast('Đã nhận xử lý hồ sơ. Hộ kinh doanh không thể sửa hồ sơ trong lúc này.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không nhận xử lý được hồ sơ');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <div className="flex-1">
            <Button
              label="Yêu cầu bổ sung"
              variant="outline"
              disabled={!canDecide}
              onPress={() => requestDecision('MORE_INFO')}
            />
          </div>
          <div className="flex-1">
            <Button label="Từ chối" variant="danger" disabled={!canDecide} onPress={() => requestDecision('REJECT')} />
          </div>
          <div className="flex-1">
            <Button
              label={identityVerified ? 'Duyệt điểm bán' : 'Duyệt (cần xác nhận CCCD trước)'}
              variant="approve"
              disabled={!canDecide || !identityVerified}
              onPress={() => requestDecision('APPROVE')}
            />
          </div>
        </StickyActions>
      }
    >
      <AppHeader
        title={displayName}
        subtitle="Thẩm định điểm kinh doanh vỉa hè"
        back
      />
      <div className="flex flex-row flex-wrap items-center justify-between gap-xs">
        <div className="flex flex-row items-center gap-xs">
          <StatusChip code={status} />
          {fastTrack ? <StatusChip label="Ưu tiên xét nhanh" tone="ok" /> : null}
        </div>
        <div className="flex flex-row gap-xs">
          {isLiveApi && status === 'SUBMITTED' ? (
            <Button label="Nhận xử lý" variant="outline" fullWidth={false} loading={claiming} onPress={claim} />
          ) : null}
          <Button
            label={ocrRunning ? 'Đang đọc CCCD...' : 'Đối soát CCCD bằng AI'}
            variant="outline"
            fullWidth={false}
            loading={ocrRunning}
            onPress={handleRunOcr}
          />
        </div>
      </div>
      {!canDecide ? (
        <p className="mt-xs text-body-sm text-muted">
          Hồ sơ đang ở trạng thái này nên không thể ra quyết định thêm.
        </p>
      ) : null}

      {/* AI OCR Citizen ID & Profile Check (Section 7.1 Master Prompt) */}
      {aiCheck ? (
        <div className="mt-sm space-y-2">
          {aiCheck.needsManualVerification || aiCheck.matchPercentage < 85 ? (
            <div className="rounded-md border border-secondary/30 bg-tint-secondary p-4">
              <div className="flex items-center gap-2 font-semibold text-on-secondary">
                <Icon name="alert-circle-outline" size={18} color={colors.onSecondary} />
                <span>Cần cán bộ kiểm tra kỹ đối chiếu CCCD gốc</span>
              </div>
              <p className="mt-1 text-body-sm text-on-secondary">
                Độ tin cậy trích xuất OCR ({aiCheck.matchPercentage}%) thấp hơn ngưỡng 85% hoặc phát hiện sai lệch. Cán bộ vui lòng trực tiếp đối chiếu ảnh CCCD bên dưới với thông tin tự khai.
              </p>
            </div>
          ) : null}

          <AiHint title="Trợ lý bóc tách & đối chiếu CCCD">
            <p>{aiCheck.summary}</p>
            {aiCheck.discrepancies.length > 0 ? (
              <ul className="mt-1 list-disc pl-4 text-body-sm text-error-ink">
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
                        ? `${check.isMatch ? 'Khớp' : 'Chưa khớp'} · độ tương đồng ${check.similarityPercent ?? 0}% (ngưỡng 80%)`
                        : `Độ tin cậy ${check.confidencePercent ?? 0}%`
                    }
                  />
                  {check.warnings ? (
                    <p className="pb-sm text-body-sm text-error-ink">{check.warnings}</p>
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

      <Section title="Xác minh danh tính (bắt buộc trước khi duyệt)">
        <Card>
          {identityVerified && liveDetail?.identityVerifiedAt ? (
            <p className="text-body-sm text-tertiary">
              Đã xác nhận lúc {new Date(liveDetail.identityVerifiedAt).toLocaleString('vi-VN')}
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

      <Section title="Giấy tờ minh chứng">
        {evidenceList.length === 0 ? (
          <p className="text-body-sm text-muted">Hộ kinh doanh chưa đính kèm giấy tờ nào.</p>
        ) : (
          <div className="flex flex-row flex-wrap gap-sm">
            {evidenceList.map((ev) => (
              <EvidencePreview
                key={ev.evidenceId || ev.type}
                evidence={{ evidenceType: ev.type, fileUrl: ev.fileUrl }}
                label={ev.label}
              />
            ))}
          </div>
        )}
      </Section>

      <Section title="Phạm vi thẩm định">
        <Card>
          <p className="text-body-sm text-muted">
            Bước này xác nhận điều kiện trật tự đô thị, an toàn giao thông và vệ sinh môi trường tại địa bàn phường.
            Nó <strong>không thay thế</strong> Giấy chứng nhận đăng ký hộ kinh doanh, vốn do Phòng Kinh tế thuộc UBND
            phường cấp theo Mẫu số 01 Phụ lục II, Thông tư 68/2025/TT-BTC.
          </p>
        </Card>
      </Section>

      <Section title="Quyết định và lý do">
        <TextField
          label="Lý do gửi kèm cho hộ kinh doanh"
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={500}
          placeholder="Nhập lý do duyệt, từ chối hoặc nội dung cần bổ sung..."
          helperText="Bắt buộc với mọi quyết định. Hộ kinh doanh sẽ đọc nội dung này."
        />
        <div className="mt-xs flex flex-row flex-wrap gap-xs">
          {Object.values(REASON_TEMPLATES)
            .flat()
            .map((template) => (
              <button
                key={template}
                type="button"
                onClick={() => setNote(template)}
                className="rounded-sm border border-border bg-card px-sm py-xs text-left text-body-sm text-text hover:bg-bg"
              >
                {template}
              </button>
            ))}
        </div>
      </Section>

      <ConfirmDialog
        visible={pendingDecision !== null}
        title={pendingDecision ? DECISION_COPY[pendingDecision].title : ''}
        description={pendingDecision ? DECISION_COPY[pendingDecision].description : undefined}
        confirmLabel={pendingDecision ? DECISION_COPY[pendingDecision].confirm : undefined}
        confirmVariant={pendingDecision ? DECISION_COPY[pendingDecision].variant : 'primary'}
        loading={deciding}
        onConfirm={sendDecision}
        onCancel={() => {
          if (!deciding) setPendingDecision(null);
        }}
      />
    </Screen>
  );
}
