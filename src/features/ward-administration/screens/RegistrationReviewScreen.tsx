import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, Icon } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { AiHint, StatusChip } from '@/components/status';
import { ErrorState, showToast } from '@/components/feedback';
import { env, isLiveApi } from '@/core/config/env';
import { useMediaQuery } from '@/hooks/useBreakpoint';
import { useMockDb } from '@/mocks/db';
import { complianceApi, type WardEnrollmentDetail } from '../ward-api';
import { formatDateTimeVi } from '../components/review/format';
import {
  DossierBlock,
  FactGrid,
  LegalNote,
  LoadingBar,
  RecordedDecision,
  ToneBox,
} from '../components/review/Primitives';
import { DecisionDeskCard } from '../components/review/PermitDossierParts';
import {
  AiMatchGauge,
  EvidenceLightTable,
  IdentityGateRail,
  KycCheckBars,
  SectionIndex,
  type IndexEntry,
} from '../components/review/RegistrationParts';

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
  const [downloadingFormat, setDownloadingFormat] = useState<'docx' | 'pdf' | null>(null);

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
        ? [
            'Ảnh chụp CCCD hơi mờ ở cụm số định danh',
            'Cần cán bộ đối chiếu lại số CCCD tự khai: 048099000222',
          ]
        : [],
      isAiGenerated: false,
    };
  }, [id, fallbackIdNumber]);

  // Where the decision desk goes: the right column on wide screens, the bottom bar
  // otherwise. Exactly one set of decision buttons is rendered at any time.
  const wide = useMediaQuery('(min-width: 1280px)');

  if (!mockRegistration && !liveDetail && !loading) {
    return (
      <Screen>
        <ErrorState message="Không tìm thấy hồ sơ đăng ký điểm kinh doanh vỉa hè." />
        <div className="flex justify-center">
          <Button
            label="Quay lại"
            variant="outline"
            fullWidth={false}
            onPress={() => navigate(-1)}
          />
        </div>
      </Screen>
    );
  }

  const displayName =
    liveDetail?.displayName ?? mockRegistration?.business_name ?? 'Điểm kinh doanh';
  const ownerName = liveDetail?.ownerName ?? mockRegistration?.owner_name ?? '';
  const idNumber = fallbackIdNumber;
  const vendorType = liveDetail?.vendorType ?? mockRegistration?.vendor_type ?? 'ITINERANT';
  const status = liveDetail?.status ?? mockRegistration?.registration_status ?? 'SUBMITTED';
  const address = liveDetail?.address ?? mockRegistration?.address ?? '';
  const fastTrack = liveDetail?.fastTrack ?? mockRegistration?.fast_track ?? false;

  const aiCheck = customAiCheck ?? liveDetail?.aiCheck ?? defaultMockAiCheck;
  const evidenceList =
    liveDetail?.evidence ??
    mockRegistration?.evidence.map((e, idx) => ({
      evidenceId: idx + 1,
      type: e.type,
      label: e.label,
      fileUrl: e.uri,
    })) ??
    [];

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
          res.isAiGenerated
            ? 'Đã đối soát CCCD thành công [AI]'
            : (res.summary ?? 'Không thể đối soát CCCD'),
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

  const downloadDocument = async (format: 'docx' | 'pdf') => {
    if (!id) return;
    setDownloadingFormat(format);
    try {
      const blob = await complianceApi.downloadEnrollmentDocument(id, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DangKyHKD_${id}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Lỗi tải hồ sơ');
    } finally {
      setDownloadingFormat(null);
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

  // Display only: values already loaded that the review now shows (BR-46).
  const submittedAt = formatDateTimeVi(liveDetail?.createdAt ?? mockRegistration?.submitted_at);
  const verifiedAtText = liveDetail?.identityVerifiedAt
    ? new Date(liveDetail.identityVerifiedAt).toLocaleString('vi-VN')
    : null;
  const reviewedAtText = formatDateTimeVi(liveDetail?.reviewedAt);
  const isAiResult = aiCheck?.isAiGenerated ?? false;
  const goToIdentity = () =>
    document.getElementById('reg-identity')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const approveLabel = identityVerified ? 'Duyệt điểm bán' : 'Duyệt (cần xác nhận CCCD trước)';
  const approveIcon = (
    <Icon
      key={identityVerified ? 'open' : 'locked'}
      name={identityVerified ? 'check-circle-outline' : 'lock-outline'}
      size={19}
      color="currentColor"
      className={identityVerified ? 'sb-pop' : ''}
    />
  );
  const noteField = (
    <TextField
      label="Ghi chú phản hồi (bắt buộc nếu từ chối / yêu cầu bổ sung)"
      value={note}
      onChangeText={setNote}
      multiline
      placeholder="Nhập lý do từ chối hoặc nội dung hồ sơ cần bổ sung..."
    />
  );
  const lockHint = !identityVerified ? (
    <p className="flex items-start gap-xs text-body-sm text-muted">
      <Icon name="lock-outline" size={15} color="currentColor" className="mt-0.5 shrink-0" />
      Cán bộ phải xác nhận đã đối chiếu CCCD thủ công trước khi duyệt hồ sơ.
    </p>
  ) : null;

  return (
    <Screen
      width="wide"
      footer={
        wide ? undefined : (
          <StickyActions>
            <div className="grid w-full grid-cols-2 gap-sm lg:grid-cols-[auto_auto_auto]">
              <Button label="Yêu cầu bổ sung" variant="outline" onPress={() => act('MORE_INFO')} />
              <Button label="Từ chối" variant="danger" onPress={() => act('REJECT')} />
              <div className="col-span-2 lg:col-span-1">
                <Button
                  label={approveLabel}
                  variant="approve"
                  icon={approveIcon}
                  disabled={!identityVerified}
                  onPress={() => act('APPROVE')}
                />
              </div>
            </div>
          </StickyActions>
        )
      }
    >
      <AppHeader
        title={displayName}
        subtitle="Thẩm định điểm kinh doanh vỉa hè (WARD-04/05/06)"
        back
      />
      <div className="flex flex-col gap-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-xs">
          <StatusChip code={status} />
          {fastTrack ? <StatusChip label="Ưu tiên xét nhanh" tone="ok" /> : null}
          {submittedAt ? (
            <span className="flex items-center gap-1 text-body-sm text-muted">
              <Icon name="clock-outline" size={15} color="currentColor" />
              Nộp lúc <span className="font-tabular">{submittedAt}</span>
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-xs">
          {isLiveApi ? (
            <>
              <Button
                label={downloadingFormat === 'docx' ? 'Đang tải...' : 'Tải .docx'}
                variant="outline"
                fullWidth={false}
                size="sm"
                icon={<Icon name="file-document-outline" size={16} color="currentColor" />}
                disabled={downloadingFormat !== null}
                onPress={() => downloadDocument('docx')}
              />
              <Button
                label={downloadingFormat === 'pdf' ? 'Đang tải...' : 'Tải .pdf'}
                variant="outline"
                fullWidth={false}
                size="sm"
                icon={<Icon name="file-document-outline" size={16} color="currentColor" />}
                disabled={downloadingFormat !== null}
                onPress={() => downloadDocument('pdf')}
              />
            </>
          ) : null}
          <Button
            label={ocrRunning ? 'Đang đọc CCCD...' : 'Quét lại CCCD [AI]'}
            variant="outline"
            fullWidth={false}
            size="sm"
            icon={<Icon name="magnify" size={16} color="currentColor" />}
            onPress={handleRunOcr}
          />
        </div>
      </div>

      {loading ? <LoadingBar /> : null}

      <div className="grid items-start gap-lg xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-xl">
        <div className="flex min-w-0 flex-col gap-lg">
          <IdentityGateRail
            aiSummary={aiCheck ? `Tham khảo · độ khớp ${aiCheck.matchPercentage}%` : 'Chưa chạy'}
            aiRunning={ocrRunning}
            identityVerified={identityVerified}
            verifiedAt={verifiedAtText}
            demo={!isLiveApi}
            onGoToIdentity={goToIdentity}
          />

          <SectionIndex entries={INDEX} />

          {liveDetail?.reviewReason || liveDetail?.reviewedBy ? (
            <RecordedDecision
              reason={liveDetail.reviewReason}
              officer={liveDetail.reviewedBy}
              at={reviewedAtText}
            />
          ) : null}

          {/* AI OCR Citizen ID & Profile Check (Section 7.1 Master Prompt) */}
          {aiCheck ? (
            <div className="flex flex-col gap-sm">
              {aiCheck.needsManualVerification || aiCheck.matchPercentage < 85 ? (
                <ToneBox
                  tone="pending"
                  icon="alert-circle-outline"
                  title="[AI] Cần cán bộ kiểm tra kỹ đối chiếu CCCD gốc"
                >
                  Độ tin cậy trích xuất OCR ({aiCheck.matchPercentage}%) thấp hơn ngưỡng 85% hoặc
                  phát hiện sai lệch. Cán bộ vui lòng trực tiếp đối chiếu ảnh CCCD bên dưới với
                  thông tin tự khai.
                </ToneBox>
              ) : null}

              <AiHint title="Trợ lý bóc tách & đối chiếu CCCD [AI]">
                <div className="flex flex-col gap-sm sm:flex-row sm:items-start">
                  <AiMatchGauge
                    percent={aiCheck.matchPercentage}
                    isAi={isAiResult}
                    running={ocrRunning}
                  />
                  <div className="min-w-0 flex-1">
                    <p>{aiCheck.summary}</p>
                    {aiCheck.discrepancies.length > 0 ? (
                      <ul className="mt-xs flex flex-col gap-1">
                        {aiCheck.discrepancies.map((d: string, i: number) => (
                          <li
                            key={i}
                            className="flex items-start gap-xs rounded-[8px] bg-[#FDEBEA] px-xs py-1 text-body-sm text-[#8F1717] dark:bg-[#3A1414] dark:text-[#FF9A90]"
                          >
                            <Icon
                              name="alert-circle-outline"
                              size={15}
                              color="currentColor"
                              className="mt-0.5 shrink-0"
                            />
                            {d}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              </AiHint>
            </div>
          ) : env.enableAiCompliance ? (
            <AiHint title="Đối chiếu dữ liệu [Hệ thống — chưa xác minh bằng AI]">
              Thông tin số CCCD và địa chỉ khai báo khớp với tiêu chuẩn điểm kinh doanh vỉa hè theo
              quy định địa phương.
            </AiHint>
          ) : null}

          {kycChecks.length > 0 ? (
            <DossierBlock
              title="Kết quả eKYC hộ kinh doanh đã thực hiện (FPT.AI)"
              icon="shield-check-outline"
            >
              <KycCheckBars checks={kycChecks} />
              <p className="text-body-sm text-muted">
                Đây là kết quả do máy chủ ghi nhận khi hộ kinh doanh nộp hồ sơ. Khớp khuôn mặt chỉ
                chứng minh hai ảnh cùng một người — <strong>không</strong> chứng minh CCCD là thật
                hay có trong Cơ sở dữ liệu quốc gia về dân cư.
              </p>
            </DossierBlock>
          ) : null}

          <DossierBlock
            id="reg-evidence"
            title="Giấy tờ minh chứng (Ảnh CCCD & Giấy phép)"
            icon="file-document-outline"
          >
            <EvidenceLightTable evidence={evidenceList} />
          </DossierBlock>

          <DossierBlock
            id="reg-identity"
            title="Xác minh danh tính (bắt buộc trước khi duyệt — BR-41)"
            icon="account-circle-outline"
          >
            <div className="rounded-[20px] bg-card p-md shadow-card ring-1 ring-border md:p-lg">
              {identityVerified && liveDetail?.identityVerifiedAt ? (
                <ToneBox
                  tone="ok"
                  icon="check-circle"
                  title={
                    <>
                      Đã xác nhận lúc{' '}
                      {new Date(liveDetail.identityVerifiedAt).toLocaleString('vi-VN')}
                      {liveDetail.identityVerificationNote
                        ? ` — "${liveDetail.identityVerificationNote}"`
                        : ''}
                    </>
                  }
                >
                  {liveDetail.identityVerifiedByName
                    ? `bởi ${liveDetail.identityVerifiedByName}`
                    : null}
                </ToneBox>
              ) : (
                <div className="flex flex-col gap-md">
                  <p className="text-[15px] leading-[24px] text-text/80">
                    AI ở trên chỉ đọc và tự đối chiếu ảnh CCCD,{' '}
                    <strong>không tra cứu Cơ sở dữ liệu quốc gia về dân cư</strong> nên không thể
                    xác minh giấy tờ là thật. Cán bộ phải trực tiếp đối chiếu ảnh/CCCD gốc với người
                    nộp hồ sơ rồi xác nhận bên dưới trước khi được phép Duyệt.
                  </p>
                  <TextField
                    label="Ghi chú đối chiếu CCCD"
                    value={identityNote}
                    onChangeText={setIdentityNote}
                    placeholder="VD: Đã đối chiếu trực tiếp tại UBND phường ngày ..., khớp CCCD gốc."
                  />
                  <div className="sm:ml-auto sm:w-[300px]">
                    <Button
                      label={confirmingIdentity ? 'Đang xác nhận...' : 'Xác nhận đã đối chiếu CCCD'}
                      variant="outline"
                      loading={confirmingIdentity}
                      onPress={handleConfirmIdentity}
                    />
                  </div>
                </div>
              )}
            </div>
          </DossierBlock>

          <DossierBlock
            id="reg-business"
            title="Thông tin điểm kinh doanh vỉa hè"
            icon="storefront-outline"
          >
            <FactGrid
              facts={[
                { label: 'Chủ hộ kinh doanh', value: ownerName || <Missing />, emphasis: true },
                {
                  label: 'Số CCCD / Định danh thật',
                  value: idNumber ? (
                    <span>
                      <span className="font-sign text-[18px] font-bold tracking-[0.02em] font-tabular">
                        {idNumber}
                      </span>{' '}
                      (CCCD 12 số)
                    </span>
                  ) : (
                    'Chưa có thông tin CCCD'
                  ),
                },
                {
                  label: 'Loại hình kinh doanh',
                  value:
                    vendorType === 'FIXED_STOREFRONT'
                      ? 'Cửa hàng cố định (Kê khai vỉa hè liền kề)'
                      : 'Bán hàng lưu động (Đăng ký vị trí vỉa hè mở)',
                },
                { label: 'Địa chỉ kinh doanh / Điểm bán', value: address || <Missing /> },
              ]}
            />
          </DossierBlock>

          <DossierBlock
            id="reg-owner"
            title="Chủ hộ kinh doanh (Mẫu số 01 Phụ lục II, TT 68/2025/TT-BTC)"
            icon="clipboard-text-outline"
          >
            <FactGrid
              facts={[
                {
                  label: 'Ngày sinh / Giới tính',
                  value: `${ownerProfile?.dateOfBirth ?? 'Chưa cập nhật'} · ${ownerProfile?.gender ?? '—'}`,
                },
                {
                  label: 'Dân tộc / Quốc tịch',
                  value: `${ownerProfile?.ethnicity ?? '—'} · ${ownerProfile?.nationality ?? '—'}`,
                },
                {
                  label: 'Giấy tờ pháp lý',
                  value: ownerProfile?.idType
                    ? `${ownerProfile.idType} — cấp ${ownerProfile.idIssuedDate ?? '—'} tại ${ownerProfile.idIssuedPlace ?? '—'}`
                    : 'Chưa cập nhật',
                },
                {
                  label: 'Địa chỉ thường trú',
                  value: ownerProfile?.permanentAddress ?? 'Chưa cập nhật',
                },
                {
                  label: 'Địa chỉ liên lạc',
                  value: ownerProfile?.contactAddress ?? 'Chưa cập nhật',
                  wide: true,
                },
              ]}
            />
          </DossierBlock>

          <DossierBlock id="reg-trade" title="Ngành nghề, quy mô hộ kinh doanh" icon="chart-bar">
            <FactGrid
              facts={[
                {
                  label: 'Ngành, nghề kinh doanh',
                  value: businessProfile?.businessLine ?? 'Chưa cập nhật',
                },
                {
                  label: 'Vốn kinh doanh / Số lao động',
                  value: `${businessProfile?.capitalAmount != null ? `${businessProfile.capitalAmount.toLocaleString('vi-VN')} đ` : '—'} · ${businessProfile?.laborCount ?? '—'} lao động`,
                },
                {
                  label: 'Ngày dự kiến bắt đầu hoạt động',
                  value: businessProfile?.plannedStartDate ?? 'Chưa cập nhật',
                },
                {
                  label: 'Cam kết an toàn thực phẩm',
                  value: liveDetail?.foodSafetyCommitmentAt
                    ? `Đã cam kết lúc ${new Date(liveDetail.foodSafetyCommitmentAt).toLocaleString('vi-VN')}`
                    : 'Chưa cam kết',
                },
              ]}
            />
            {householdMembers.length > 0 ? (
              <div className="flex flex-col gap-xs">
                <h3 className="text-[15px] font-semibold text-text">
                  Thành viên hộ gia đình cùng góp vốn
                </h3>
                <ul className="grid gap-sm sm:grid-cols-2">
                  {householdMembers.map((m, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-sm rounded-[14px] bg-card p-sm ring-1 ring-border"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tint-indigo text-indigo">
                        <Icon name="account-circle-outline" size={22} color="currentColor" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[16px] font-semibold text-text">
                          {m.fullName}
                        </span>
                        <span className="block text-body-sm text-muted">
                          {`${m.relationshipToOwner ?? 'Thành viên'} · ${m.capitalContribution != null ? `${m.capitalContribution.toLocaleString('vi-VN')} đ` : 'Chưa khai vốn góp'}`}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </DossierBlock>

          <div id="reg-legal" className="scroll-mt-md">
            <LegalNote title="Căn cứ pháp lý thẩm quyền cấp phường">
              * Căn cứ Nghị định 168/2025/NĐ-CP (thay thế Nghị định 01/2021/NĐ-CP từ 01/07/2025) và
              mô hình chính quyền địa phương 2 cấp: thẩm quyền cấp Giấy chứng nhận đăng ký hộ kinh
              doanh nay thuộc{' '}
              <strong>
                Phòng Kinh tế / Phòng Kinh tế, Hạ tầng và Đô thị thuộc UBND cấp xã (phường)
              </strong>{' '}
              — không còn cấp quận/huyện. Thủ tục thẩm định điểm bán vỉa hè này (WARD-04/05/06) xác
              nhận điều kiện trật tự đô thị, an toàn giao thông và vệ sinh môi trường tại địa bàn
              phường; nó <strong>không thay thế</strong> Giấy chứng nhận đăng ký hộ kinh doanh — hộ
              kinh doanh vẫn phải đăng ký riêng theo Mẫu số 01 Phụ lục II, Thông tư 68/2025/TT-BTC.
            </LegalNote>
          </div>

          {wide ? null : noteField}
        </div>

        {wide ? (
          <div className="flex flex-col gap-md pb-[88px] xl:sticky xl:top-md">
            <DecisionDeskCard title="Quyết định thẩm định">
              <p
                className={`flex items-center gap-xs rounded-[12px] px-sm py-xs text-body-sm font-semibold ${
                  identityVerified
                    ? 'bg-[#E6F6EC] text-[#0B5D33] dark:bg-[#10301F] dark:text-[#8BE3B0]'
                    : 'bg-[#FFF3E8] text-[#8A3200] dark:bg-[#3A2414] dark:text-[#FFB98A]'
                }`}
              >
                <Icon
                  name={identityVerified ? 'check-circle' : 'lock-outline'}
                  size={16}
                  color="currentColor"
                />
                {identityVerified ? 'Cổng BR-41: đã mở' : 'Cổng BR-41: chờ bước 2'}
              </p>
              {noteField}
              <div className="flex flex-col gap-sm">
                <Button
                  label={approveLabel}
                  variant="approve"
                  icon={approveIcon}
                  disabled={!identityVerified}
                  onPress={() => act('APPROVE')}
                />
                {lockHint}
                <Button
                  label="Yêu cầu bổ sung"
                  variant="outline"
                  onPress={() => act('MORE_INFO')}
                />
                <div className="pt-xs">
                  <Button label="Từ chối" variant="danger" onPress={() => act('REJECT')} />
                </div>
              </div>
            </DecisionDeskCard>
          </div>
        ) : null}
      </div>
    </Screen>
  );
}

const INDEX: IndexEntry[] = [
  { id: 'reg-evidence', label: 'Giấy tờ' },
  { id: 'reg-identity', label: 'Danh tính' },
  { id: 'reg-business', label: 'Điểm bán' },
  { id: 'reg-owner', label: 'Mẫu 01' },
  { id: 'reg-trade', label: 'Ngành nghề' },
  { id: 'reg-legal', label: 'Căn cứ' },
];

function Missing() {
  return <span className="font-normal italic text-muted">Chưa cập nhật</span>;
}
