import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Button, Card } from '@/components/common';
import { PhotoPicker, SegmentedControl, SelectField, TextField } from '@/components/forms';
import { AppHeader, Screen, Section, StickyActions } from '@/components/layout';
import { AiHint } from '@/components/status';
import { showToast } from '@/components/feedback';
import { isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import {
  complianceApi,
  violationTypeLabels,
  wardApi,
  type PenaltyScheduleItem,
  type WardViolationDetail,
} from '../ward-api';
import { hhmm, vnDateOf, wardConfigApi } from '../ward-config-api';

export function RecordViolationScreen() {
  const [searchParams] = useSearchParams();
  const paramContractId = searchParams.get('contractId') ?? undefined;
  const paramSlotId = searchParams.get('slotId') ?? undefined;
  const paramVendorId = searchParams.get('vendorId') ?? undefined;

  const navigate = useNavigate();
  const vendors = useMockDb((s) => s.vendors);
  const recordViolationMock = useMockDb((s) => s.recordViolation);

  // Live mode: the vendor picker must list real vendor_id values from the server, not the mock
  // store -- submitting a mock id against the live API fails with a foreign-key error (vendor_id
  // doesn't exist), the "An unexpected error occurred" an officer would otherwise hit here.
  const [liveVendors, setLiveVendors] = useState<{ vendorId: number; displayName: string; ownerName: string }[]>([]);
  useEffect(() => {
    if (!isLiveApi || paramVendorId) return;
    complianceApi
      .listEnrollments('APPROVED')
      .then((items) =>
        setLiveVendors(items.map((i) => ({ vendorId: i.vendorId, displayName: i.displayName, ownerName: i.ownerName }))),
      )
      .catch(() => showToast('Không tải được danh sách hộ kinh doanh.'));
  }, [paramVendorId]);

  // Form State
  const [vendorId, setVendorId] = useState(paramVendorId ?? '');
  useEffect(() => {
    if (!vendorId && liveVendors[0]) setVendorId(String(liveVendors[0].vendorId));
  }, [liveVendors, vendorId]);
  const [slotId] = useState(paramSlotId ?? '');
  const [contractId] = useState(paramContractId ?? '');
  const [typeCode, setTypeCode] = useState('UNAUTHORIZED_BUSINESS_USE');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string>();
  const [photoFileUrl, setPhotoFileUrl] = useState<string>();
  const [photoUploading, setPhotoUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Mẫu số 01 (Nghị định 118/2021/NĐ-CP): witness / ward-representative block, required only
  // when the violator cannot or will not sign -- both fields stay empty in the normal case.
  const [witnessName, setWitnessName] = useState('');
  const [witnessRole, setWitnessRole] = useState<'WITNESS' | 'WARD_REPRESENTATIVE'>('WITNESS');
  const [witnessOccupation, setWitnessOccupation] = useState('');
  const [witnessAddress, setWitnessAddress] = useState('');
  const [containmentMeasures, setContainmentMeasures] = useState('');
  // Điều 61 Luật XLVPHC: the violator's right to giải trình before a sanction may issue.
  const [explanationRequired, setExplanationRequired] = useState(false);
  const [explanationMethod, setExplanationMethod] = useState<'DIRECT' | 'WRITTEN'>('WRITTEN');

  // Live penalty schedules from DB
  const [schedules, setSchedules] = useState<PenaltyScheduleItem[]>([]);
  const [createdViolation, setCreatedViolation] = useState<WardViolationDetail | null>(null);

  // BR-41: decision support only -- a reference note shown when the officer picks "Ngoài giờ".
  // The system never reads the clock itself and never blocks recording the violation; the officer
  // still decides based on what they saw on site.
  const [zoneHoursText, setZoneHoursText] = useState<string | null>(null);
  useEffect(() => {
    if (!isLiveApi || !slotId) return;
    Promise.all([wardConfigApi.slotGrid(), wardConfigApi.listZones()])
      .then(([grid, zones]) => {
        const slot = grid.slots.find((s) => s.slotId === Number(slotId));
        const zone = slot && zones.find((z) => z.zoneId === slot.zoneId);
        if (!zone) return;
        setZoneHoursText(
          zone.availableFrom
            ? `${hhmm(zone.availableFrom)} – ${hhmm(zone.availableTo)}${zone.isOvernight ? ' (qua đêm)' : ''}`
            : 'không giới hạn khung giờ',
        );
      })
      .catch(() => {});
  }, [slotId]);

  // Step 2: Sanction Form State (WARD-13 authority split: the patrolling officer above does
  // not have sanction authority -- only the Chairman/Vice-Chairman or a written delegate does).
  // The signer is never typed here: the server takes it from the logged-in officer's own
  // account (UserAccounts.sanction_authority_title). This just shows what that account has.
  const [decisionNumber, setDecisionNumber] = useState('');
  const [sanctionScheduleId, setSanctionScheduleId] = useState<number | null>(null);
  const [sanctionAuthorityTitle, setSanctionAuthorityTitle] = useState<string | null | undefined>(undefined);
  const [sanctionNotes, setSanctionNotes] = useState('');

  useEffect(() => {
    if (!isLiveApi) return;
    wardApi
      .me()
      .then((profile) => setSanctionAuthorityTitle(profile.sanctionAuthorityTitle))
      .catch(() => setSanctionAuthorityTitle(null));
  }, []);
  const [sanctioning, setSanctioning] = useState(false);
  // Set from the backend's "explanation_window_open" refusal -- Điều 61 Luật XLVPHC gives the
  // violator that window before a decision may issue; the officer can explicitly override it.
  const [explanationBlockedMessage, setExplanationBlockedMessage] = useState<string | null>(null);
  const [acknowledgeEarlySanction, setAcknowledgeEarlySanction] = useState(false);

  // Post-record giải trình / handover actions (WARD-12).
  const [explanationContent, setExplanationContent] = useState('');
  const [submittingExplanation, setSubmittingExplanation] = useState(false);
  const [deliveredToName, setDeliveredToName] = useState('');
  const [deliveryRefusalReason, setDeliveryRefusalReason] = useState('');
  const [submittingDelivery, setSubmittingDelivery] = useState(false);
  const [downloadingDocument, setDownloadingDocument] = useState(false);

  const downloadDocument = async () => {
    if (!createdViolation) return;
    setDownloadingDocument(true);
    try {
      const blob = await complianceApi.downloadViolationDocument(createdViolation.violationId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BienBan_${(createdViolation.bienBanSo ?? createdViolation.violationId).toString().replace('/', '-')}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Lỗi tải biên bản');
    } finally {
      setDownloadingDocument(false);
    }
  };

  useEffect(() => {
    if (!isLiveApi) return;
    complianceApi
      .listPenaltySchedules()
      .then((data) => {
        setSchedules(data);
        if (data.length > 0 && data[0]) {
          setTypeCode(data[0].violationType);
        }
      })
      .catch((err) => console.warn('Could not load penalty schedules:', err));
  }, []);

  const selectedSchedule = schedules.find((s) => s.violationType === typeCode);
  const sanctionOptions = createdViolation
    ? schedules.filter((s) => s.violationType === createdViolation.violationType)
    : [];

  // Step 1: Record Violation (PENDING_SANCTION)
  const submitRecord = async () => {
    if (!description.trim()) {
      showToast('Vui lòng nhập mô tả hành vi vi phạm hiện trường');
      return;
    }

    if (isLiveApi) {
      if (photoUri && !photoFileUrl) {
        showToast('Ảnh hiện trường đang tải lên, vui lòng đợi rồi thử lại.');
        return;
      }
      setLoading(true);
      try {
        const res = await complianceApi.recordViolation({
          contractId: contractId ? Number(contractId) : undefined,
          slotId: slotId ? Number(slotId) : undefined,
          vendorId: vendorId ? Number(vendorId) : undefined,
          violationType: typeCode,
          description: description.trim(),
          // evidenceUrl must be a server file URL the backend/AI can fetch -- never the
          // browser-local blob: URL from PhotoPicker's preview (photoUri).
          evidenceUrl: photoFileUrl,
          witnessName: witnessName.trim() || undefined,
          witnessRole: witnessName.trim() ? witnessRole : undefined,
          witnessOccupation: witnessOccupation.trim() || undefined,
          witnessAddress: witnessAddress.trim() || undefined,
          containmentMeasures: containmentMeasures.trim() || undefined,
          explanationRequired,
          explanationMethod: explanationRequired ? explanationMethod : undefined,
        });
        setCreatedViolation(res);
        // The rate that applies is the one in force on the violation date, for this violation's own type.
        const inForce = await complianceApi.listPenaltySchedules(vnDateOf(res.recordedAt));
        setSchedules(inForce);
        const own = inForce.find((s) => s.violationType === res.violationType && s.legalBasis);
        setSanctionScheduleId(own?.scheduleId ?? null);
        showToast(
          'Đã lập biên bản vi phạm (Bước 1/2). Tiếp tục ra Quyết định xử phạt nếu có thẩm quyền.',
        );
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Lỗi lập biên bản vi phạm');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Mock fallback -- clearly labelled [Mô phỏng], not [AI], and never invents a specific
    // Điều/Khoản beyond the decree name already seeded in PenaltyFeeSchedules.legal_basis.
    const mockViolId = Date.now();
    const mockAiSuggestion = {
      violationType: typeCode,
      penaltyScheduleId: selectedSchedule?.scheduleId ?? null,
      legalBasis: selectedSchedule?.legalBasis ?? 'Nghị định 168/2024/NĐ-CP',
      suggestedPenaltyAmount: selectedSchedule?.penaltyAmount ?? 2500000,
      hanhViViPham: `Hành vi: ${violationTypeLabels[typeCode] || typeCode}.`,
      bienPhapKhacPhuc:
        'Buộc khôi phục lại tình trạng ban đầu, thu dọn vật dụng lấn chiếm trong thời hạn cán bộ ấn định.',
      isAiGenerated: false,
    };

    setCreatedViolation({
      violationId: mockViolId,
      contractId: contractId ? Number(contractId) : null,
      slotId: slotId ? Number(slotId) : null,
      slotCode: 'NVL-022',
      vendorId: vendorId ? Number(vendorId) : null,
      vendorName: vendors.find((v) => v.id === vendorId)?.business_name ?? 'Hộ kinh doanh Bà Năm',
      violationType: typeCode,
      violationTypeName: violationTypeLabels[typeCode] || typeCode,
      status: 'PENDING_SANCTION',
      penaltyAmount: null,
      recordedAt: new Date().toISOString(),
      recordedByName: 'Cán bộ Phạm Văn Sơn',
      description: description.trim(),
      evidenceUrl: photoUri ?? null,
      sanctionDecisionNumber: null,
      signerName: null,
      signerTitle: null,
      sanctionedAt: null,
      recentViolationCount90Days: 1,
      aiSuggestion: mockAiSuggestion,
      bienBanSo: `${String(mockViolId).slice(-4)}/BB-VPHC-${new Date().getFullYear()}`,
      preparedLocation: 'NVL-022 - Khu A',
      witnessName: witnessName.trim() || null,
      witnessRole: witnessName.trim() ? witnessRole : null,
      witnessOccupation: witnessOccupation.trim() || null,
      witnessAddress: witnessAddress.trim() || null,
      containmentMeasures: containmentMeasures.trim() || null,
      violatorFullName: vendors.find((v) => v.id === vendorId)?.business_name ?? null,
      violatorDateOfBirth: null,
      violatorGender: null,
      violatorNationality: null,
      violatorIdNumber: null,
      violatorIdIssuedDate: null,
      violatorIdIssuedPlace: null,
      violatorAddress: null,
      explanationRequired,
      explanationMethod: explanationRequired ? explanationMethod : null,
      explanationDeadlineAt: null,
      explanationReceivedAt: null,
      explanationContent: null,
      deliveredAt: null,
      deliveredToName: null,
      deliveryRefused: false,
      deliveryRefusalReason: null,
      complianceFlag: {
        violationThreshold: null,
        sanctionedViolationCount: 0,
        violationThresholdReached: false,
        unpaidPenaltyGraceDays: null,
        hasOverduePenalty: false,
        overduePenaltyDays: null,
      },
    });

    if (mockAiSuggestion.penaltyScheduleId) {
      setSanctionScheduleId(mockAiSuggestion.penaltyScheduleId);
    }
    setDecisionNumber(`01/QĐ-XPHC-${new Date().getFullYear()}`);
    showToast('Đã lập biên bản vi phạm (Bước 1/2). Tiếp tục ra Quyết định xử phạt.');
  };

  // Step 2: Sanction Decision (SANCTIONED)
  const submitSanction = async () => {
    if (!createdViolation) return;
    if (!decisionNumber.trim()) {
      showToast('Vui lòng nhập số Quyết định xử phạt hành chính');
      return;
    }
    // Never fall back to another schedule: a fine must use this violation type's own rate with a legal basis.
    const schedId = sanctionOptions.find(
      (s) => s.scheduleId === sanctionScheduleId && s.legalBasis,
    )?.scheduleId;
    if (isLiveApi && !schedId) {
      showToast(
        'Vi phạm này chưa có căn cứ pháp lý hoặc mức phạt hiệu lực. Vui lòng cấu hình Bảng phạt trước.',
      );
      return;
    }

    if (isLiveApi && !sanctionAuthorityTitle) {
      showToast(
        'Tài khoản của bạn chưa được giao thẩm quyền ký quyết định xử phạt. Chỉ Chủ tịch, Phó Chủ tịch UBND phường hoặc người được uỷ quyền bằng văn bản mới được ký.',
      );
      return;
    }

    setSanctioning(true);
    try {
      if (isLiveApi) {
        await complianceApi.sanctionViolation(
          createdViolation.violationId,
          schedId!,
          decisionNumber.trim(),
          sanctionNotes.trim() || undefined,
          acknowledgeEarlySanction,
        );
        setExplanationBlockedMessage(null);
      } else {
        // Mock demo
        recordViolationMock(
          {
            vendorId,
            slotId,
            violation_type: typeCode,
            note: description.trim(),
            photoUris: photoUri ? [photoUri] : [],
            reportedBy: 'WARD',
          },
          selectedSchedule?.penaltyAmount ?? 2500000,
        );
      }
      showToast('Đã ban hành Quyết định xử phạt hành chính thành công');
      navigate(-1);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi ban hành quyết định xử phạt';
      // The backend has no separate error code the client can rely on for this case (see
      // GlobalExceptionHandler -- only known generic codes survive to ApiError.code), so this
      // specific wording is how "still within Điều 61's giải trình window" is recognized here.
      if (message.includes('quyền giải trình')) {
        setExplanationBlockedMessage(message);
      } else {
        showToast(message);
      }
    } finally {
      setSanctioning(false);
    }
  };

  const submitExplanation = async () => {
    if (!createdViolation || !explanationContent.trim()) return;
    setSubmittingExplanation(true);
    try {
      const updated = await complianceApi.recordExplanation(
        createdViolation.violationId,
        explanationContent.trim(),
      );
      setCreatedViolation(updated);
      setExplanationBlockedMessage(null);
      showToast('Đã ghi nhận giải trình của người vi phạm');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Lỗi ghi nhận giải trình');
    } finally {
      setSubmittingExplanation(false);
    }
  };

  const submitDelivery = async (refused: boolean) => {
    if (!createdViolation) return;
    if (refused && !deliveryRefusalReason.trim()) {
      showToast('Vui lòng nhập lý do người vi phạm từ chối nhận biên bản');
      return;
    }
    if (!refused && !deliveredToName.trim()) {
      showToast('Vui lòng nhập tên người nhận biên bản');
      return;
    }
    setSubmittingDelivery(true);
    try {
      const updated = await complianceApi.deliverViolation(
        createdViolation.violationId,
        refused ? null : deliveredToName.trim(),
        refused,
        refused ? deliveryRefusalReason.trim() : null,
      );
      setCreatedViolation(updated);
      showToast(refused ? 'Đã ghi nhận việc từ chối nhận biên bản' : 'Đã ghi nhận giao biên bản');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Lỗi ghi nhận giao biên bản');
    } finally {
      setSubmittingDelivery(false);
    }
  };

  return (
    <Screen
      footer={
        <StickyActions>
          {!createdViolation ? (
            <Button
              label={
                photoUploading
                  ? 'Đang tải ảnh lên...'
                  : loading
                    ? 'Đang lập biên bản...'
                    : 'Lập biên bản vi phạm (Bước 1)'
              }
              variant="danger"
              disabled={loading || photoUploading || !description.trim()}
              onPress={submitRecord}
            />
          ) : (
            <div className="flex w-full gap-sm">
              <div className="flex-1">
                <Button
                  label="Hoàn tất (Chờ xử phạt sau)"
                  variant="outline"
                  onPress={() => navigate(-1)}
                />
              </div>
              <div className="flex-1">
                <Button
                  label={sanctioning ? 'Đang ban hành...' : 'Ban hành Quyết định (Bước 2)'}
                  variant="approve"
                  disabled={
                    sanctioning || !decisionNumber.trim() || (isLiveApi && !sanctionAuthorityTitle)
                  }
                  onPress={submitSanction}
                />
              </div>
            </div>
          )}
        </StickyActions>
      }
    >
      <AppHeader
        title={createdViolation ? 'Ra Quyết định xử phạt' : 'Lập biên bản vi phạm'}
        subtitle="Xử lý vi phạm trật tự hè phố (WARD-12)"
        back
      />

      {/* STEP 1: RECORD VIOLATION */}
      {!createdViolation ? (
        <>
          {!paramVendorId ? (
            <Section title="Hộ kinh doanh vi phạm">
              {isLiveApi ? (
                liveVendors.length === 0 ? (
                  <p className="text-body-sm text-muted">Đang tải danh sách hộ kinh doanh…</p>
                ) : (
                  <SelectField
                    value={vendorId}
                    onChange={setVendorId}
                    options={liveVendors.map((v) => ({
                      value: String(v.vendorId),
                      label: `${v.displayName} (${v.ownerName})`,
                    }))}
                  />
                )
              ) : (
                <SelectField
                  value={vendorId}
                  onChange={setVendorId}
                  options={vendors.map((v) => ({
                    value: v.id,
                    label: `${v.business_name} (${v.phone})`,
                  }))}
                />
              )}
            </Section>
          ) : null}

          <Section title="Hành vi vi phạm (Căn cứ pháp lý luật hiện hành 2026)">
            <SelectField
              value={typeCode}
              onChange={setTypeCode}
              options={
                schedules.length > 0
                  ? schedules.map((s) => ({
                      value: s.violationType,
                      label: s.violationTypeName,
                      description: s.legalBasis
                        ? `${s.penaltyAmount.toLocaleString('vi-VN')} đ · ${s.legalBasis}`
                        : '⚠️ Thiếu căn cứ pháp lý: lập được biên bản nhưng chưa thể ra quyết định xử phạt tiền',
                    }))
                  : Object.keys(violationTypeLabels).map((key) => ({
                      value: key,
                      label: violationTypeLabels[key] || key,
                      description: 'Căn cứ Nghị định 168/2024/NĐ-CP',
                    }))
              }
            />
          </Section>

          {typeCode === 'OUTSIDE_HOURS' && zoneHoursText && (
            <Card>
              <p className="text-body-xs font-semibold text-muted">
                KHUNG GIỜ HOẠT ĐỘNG ĐÃ CẤU HÌNH CHO KHU VỰC NÀY:
              </p>
              <p className="mt-1 text-body-sm text-foreground">{zoneHoursText}</p>
              <p className="mt-1 text-body-xs text-muted">
                Chỉ để tham khảo — hệ thống không tự kiểm tra giờ, cán bộ vẫn quyết định dựa trên
                hiện trường.
              </p>
            </Card>
          )}

          {selectedSchedule?.legalBasis ? (
            <Card>
              <p className="text-body-xs font-semibold text-muted">CĂN CỨ PHÁP LÝ ÁP DỤNG:</p>
              <p className="mt-1 text-body-sm text-foreground">{selectedSchedule.legalBasis}</p>
              <p className="mt-1 text-headline-sm font-bold text-danger">
                Mức phạt (trung bình khung):{' '}
                {selectedSchedule.penaltyAmount.toLocaleString('vi-VN')} đ
              </p>
            </Card>
          ) : null}

          <Section title="Mô tả hiện trường & Bằng chứng">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-body-xs text-muted">Mô tả vi phạm:</span>
              <button
                type="button"
                className="text-body-xs font-medium text-primary hover:underline"
                onClick={() => {
                  setTypeCode('UNAUTHORIZED_BUSINESS_USE');
                  setDescription(
                    'Hộ kinh doanh kê 3 bộ bàn ghế nhựa và 1 biển hiệu đứng lấn ra ngoài vạch sơn 45cm trên vỉa hè đường Nguyễn Văn Linh, cản trở lối đi của người đi bộ.',
                  );
                }}
              >
                + Điền mô tả mẫu để thử nghiệm AI Co-pilot
              </button>
            </div>
            <TextField
              label="Mô tả chi tiết vi phạm tại hiện trường"
              value={description}
              onChangeText={setDescription}
              multiline
              placeholder="Ví dụ: Bày bán hàng hóa, kê bàn ghế lấn chiếm 0.5m vỉa hè ngoài vạch kẻ cho phép, cản trở lối đi bộ..."
            />

            <PhotoPicker
              label={
                photoUploading ? 'Đang tải ảnh lên...' : 'Ảnh chụp hiện trường / Tang vật vi phạm'
              }
              uri={photoUri}
              onChange={(uri, file) => {
                // uri is a browser-local blob: URL for preview only -- the server can never
                // fetch it. Upload the real File and keep the returned server URL separately;
                // submitRecord sends photoFileUrl, never photoUri, as evidenceUrl.
                setPhotoUri(uri);
                setPhotoFileUrl(undefined);
                if (isLiveApi) {
                  setPhotoUploading(true);
                  complianceApi
                    .uploadEvidence(file)
                    .then((res) => setPhotoFileUrl(res.fileUrl))
                    .catch((err: unknown) =>
                      showToast(err instanceof Error ? err.message : 'Tải ảnh lên thất bại'),
                    )
                    .finally(() => setPhotoUploading(false));
                }
              }}
              onRemove={() => {
                setPhotoUri(undefined);
                setPhotoFileUrl(undefined);
              }}
            />
          </Section>

          <Section title="Người chứng kiến / Đại diện chính quyền (nếu người vi phạm vắng mặt hoặc không ký)">
            <TextField
              label="Họ và tên"
              value={witnessName}
              onChangeText={setWitnessName}
              placeholder="Để trống nếu không có"
            />
            {witnessName.trim() ? (
              <>
                <SelectField
                  label="Tư cách"
                  value={witnessRole}
                  onChange={(v) => setWitnessRole(v as 'WITNESS' | 'WARD_REPRESENTATIVE')}
                  options={[
                    { value: 'WITNESS', label: 'Người chứng kiến' },
                    { value: 'WARD_REPRESENTATIVE', label: 'Đại diện chính quyền địa phương' },
                  ]}
                />
                <TextField
                  label="Nghề nghiệp"
                  value={witnessOccupation}
                  onChangeText={setWitnessOccupation}
                />
                <TextField label="Địa chỉ" value={witnessAddress} onChangeText={setWitnessAddress} />
              </>
            ) : null}
          </Section>

          <Section title="Biện pháp ngăn chặn (nếu có)">
            <TextField
              label="Biện pháp đã áp dụng tại hiện trường"
              value={containmentMeasures}
              onChangeText={setContainmentMeasures}
              multiline
              placeholder="Ví dụ: Tạm giữ tang vật, yêu cầu chấm dứt ngay hành vi vi phạm..."
            />
          </Section>

          <Section title="Quyền giải trình (Điều 61 Luật Xử lý vi phạm hành chính)">
            <label className="flex cursor-pointer items-start gap-sm">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={explanationRequired}
                onChange={(e) => setExplanationRequired(e.target.checked)}
              />
              <span className="text-body-sm text-text">
                Hành vi này thuộc trường hợp người vi phạm có quyền giải trình trước khi ra quyết
                định xử phạt.
              </span>
            </label>
            {explanationRequired ? (
              <div className="mt-2">
                <SegmentedControl
                  value={explanationMethod}
                  onChange={setExplanationMethod}
                  options={[
                    { value: 'DIRECT', label: 'Trực tiếp (2 ngày làm việc)' },
                    { value: 'WRITTEN', label: 'Bằng văn bản (5 ngày làm việc)' },
                  ]}
                />
              </div>
            ) : null}
          </Section>

          <Card>
            <p className="text-body-sm text-muted">
              * Quy trình 2 bước: Cán bộ tuần tra lập biên bản xác nhận hành vi vi phạm tại hiện
              trường (`PENDING_SANCTION`). Sau đó,{' '}
              <strong>Chủ tịch/Phó Chủ tịch UBND Phường</strong> (hoặc người được uỷ quyền bằng văn
              bản — cán bộ lập biên bản không có thẩm quyền này) ký Quyết định xử phạt
              (`SANCTIONED`) với số tiền lấy từ khung do Phường cấu hình (`PenaltyFeeSchedules`).
            </p>
          </Card>
        </>
      ) : (
        /* STEP 2: SANCTION DECISION */
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-700/60 dark:bg-emerald-950/30">
            <p className="font-semibold text-emerald-800 dark:text-emerald-200">
              ✓ Đã lập biên bản vi phạm #{createdViolation.violationId}
            </p>
            <p className="text-body-sm text-emerald-700 dark:text-emerald-300">
              Trạng thái hiện tại: <strong>Chờ ra quyết định xử phạt (PENDING_SANCTION)</strong>
            </p>
            {createdViolation.bienBanSo ? (
              <p className="text-body-sm text-emerald-700 dark:text-emerald-300">
                Số biên bản: <strong>{createdViolation.bienBanSo}</strong>
                {createdViolation.preparedLocation ? ` · Nơi lập: ${createdViolation.preparedLocation}` : ''}
              </p>
            ) : null}
            {isLiveApi && (
              <div className="mt-2">
                <Button
                  label={downloadingDocument ? 'Đang tải...' : 'Tải biên bản (.docx)'}
                  variant="outline"
                  fullWidth={false}
                  disabled={downloadingDocument}
                  onPress={downloadDocument}
                />
              </div>
            )}
          </div>

          {createdViolation.explanationRequired ? (
            <Card>
              <p className="text-body-xs font-semibold text-muted">
                QUYỀN GIẢI TRÌNH (ĐIỀU 61 LUẬT XLVPHC)
              </p>
              <p className="mt-1 text-body-sm text-foreground">
                Hình thức:{' '}
                {createdViolation.explanationMethod === 'DIRECT' ? 'Trực tiếp' : 'Bằng văn bản'}
                {createdViolation.explanationDeadlineAt
                  ? ` · Hạn: ${new Date(createdViolation.explanationDeadlineAt).toLocaleString('vi-VN')}`
                  : ''}
              </p>
              {createdViolation.explanationReceivedAt ? (
                <p className="mt-1 text-body-sm text-emerald-700 dark:text-emerald-300">
                  ✓ Đã nhận giải trình lúc{' '}
                  {new Date(createdViolation.explanationReceivedAt).toLocaleString('vi-VN')}
                  {createdViolation.explanationContent ? `: “${createdViolation.explanationContent}”` : ''}
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  <TextField
                    label="Nội dung giải trình của người vi phạm"
                    value={explanationContent}
                    onChangeText={setExplanationContent}
                    multiline
                  />
                  <Button
                    label={submittingExplanation ? 'Đang ghi nhận...' : 'Ghi nhận giải trình'}
                    variant="outline"
                    fullWidth={false}
                    disabled={submittingExplanation || !explanationContent.trim()}
                    onPress={submitExplanation}
                  />
                </div>
              )}
            </Card>
          ) : null}

          {(createdViolation.complianceFlag.violationThresholdReached ||
            createdViolation.complianceFlag.hasOverduePenalty) && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700/60 dark:bg-amber-950/30">
              <p className="font-semibold text-amber-800 dark:text-amber-200">
                ⚠️ Đề xuất xem xét thu hồi giấy phép
              </p>
              {createdViolation.complianceFlag.violationThresholdReached && (
                <p className="mt-1 text-body-sm text-amber-900/90 dark:text-amber-200/90">
                  Đã đạt {createdViolation.complianceFlag.sanctionedViolationCount}/
                  {createdViolation.complianceFlag.violationThreshold} lần vi phạm đã có quyết định
                  xử phạt trong cửa sổ thời gian phường đã cấu hình.
                </p>
              )}
              {createdViolation.complianceFlag.hasOverduePenalty && (
                <p className="mt-1 text-body-sm text-amber-900/90 dark:text-amber-200/90">
                  Còn khoản phạt chưa nộp quá {createdViolation.complianceFlag.overduePenaltyDays}{' '}
                  ngày.
                </p>
              )}
              <p className="mt-1 text-body-xs text-amber-900/80 dark:text-amber-200/80">
                Chỉ là gợi ý — cán bộ tự quyết định có thu hồi giấy phép sử dụng tạm thời hè phố hay
                không, tại màn hình quản lý giấy phép tương ứng.
              </p>
            </div>
          )}

          <Card>
            <p className="text-body-xs font-semibold text-muted">GIAO BIÊN BẢN</p>
            {createdViolation.deliveredAt ? (
              <p className="mt-1 text-body-sm text-emerald-700 dark:text-emerald-300">
                ✓ Đã giao cho {createdViolation.deliveredToName} lúc{' '}
                {new Date(createdViolation.deliveredAt).toLocaleString('vi-VN')}
              </p>
            ) : createdViolation.deliveryRefused ? (
              <p className="mt-1 text-body-sm text-error">
                ✗ Người vi phạm từ chối nhận: {createdViolation.deliveryRefusalReason}
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                <TextField
                  label="Người nhận biên bản"
                  value={deliveredToName}
                  onChangeText={setDeliveredToName}
                />
                <Button
                  label={submittingDelivery ? 'Đang ghi nhận...' : 'Đã giao biên bản'}
                  variant="approve"
                  fullWidth={false}
                  disabled={submittingDelivery || !deliveredToName.trim()}
                  onPress={() => submitDelivery(false)}
                />
                <TextField
                  label="Hoặc lý do từ chối nhận (nếu có)"
                  value={deliveryRefusalReason}
                  onChangeText={setDeliveryRefusalReason}
                />
                <Button
                  label="Người vi phạm từ chối nhận"
                  variant="outline"
                  fullWidth={false}
                  disabled={submittingDelivery || !deliveryRefusalReason.trim()}
                  onPress={() => submitDelivery(true)}
                />
              </div>
            )}
          </Card>

          {/* AI Legal Co-pilot -- Mau MBB01 (Nghị định 118/2021/NĐ-CP) structure.
              LegalBasis and SuggestedPenaltyAmount always come from the ward's own
              PenaltyFeeSchedules row on the backend, never AI-authored text. */}
          {createdViolation.aiSuggestion ? (
            <AiHint
              title={
                createdViolation.aiSuggestion.isAiGenerated
                  ? 'Trợ lý Pháp lý [AI]'
                  : 'Trợ lý Pháp lý [Hệ thống — chưa xác minh bằng AI]'
              }
            >
              <p className="font-medium text-text">{createdViolation.aiSuggestion.hanhViViPham}</p>
              <p className="mt-1 text-body-sm text-text">
                Biện pháp khắc phục: {createdViolation.aiSuggestion.bienPhapKhacPhuc}
              </p>
              <p className="mt-1 text-body-xs font-semibold text-indigo">
                Căn cứ pháp lý (từ biểu khung Phường): {createdViolation.aiSuggestion.legalBasis}
              </p>
              {createdViolation.aiSuggestion.suggestedPenaltyAmount ? (
                <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
                  <span className="text-body-sm font-bold text-danger">
                    Mức phạt:{' '}
                    {createdViolation.aiSuggestion.suggestedPenaltyAmount.toLocaleString('vi-VN')} đ
                  </span>
                  <Button
                    label="Áp dụng khung này"
                    variant="outline"
                    fullWidth={false}
                    onPress={() => {
                      if (createdViolation.aiSuggestion?.penaltyScheduleId) {
                        setSanctionScheduleId(createdViolation.aiSuggestion.penaltyScheduleId);
                      }
                      showToast('Đã áp dụng khung xử phạt vào quyết định');
                    }}
                  />
                </div>
              ) : null}
            </AiHint>
          ) : null}

          <Section title="Thông tin Quyết định xử phạt hành chính">
            <TextField
              label="Số Quyết định xử phạt hành chính *"
              value={decisionNumber}
              onChangeText={setDecisionNumber}
              placeholder="Ví dụ: 01/QĐ-XPHC-HC1"
            />

            <SelectField
              label="Khung xử phạt áp dụng"
              value={String(sanctionScheduleId || '')}
              onChange={(val) => setSanctionScheduleId(Number(val))}
              options={sanctionOptions
                .filter((s) => s.legalBasis)
                .map((s) => ({
                  value: String(s.scheduleId),
                  label: `${s.violationTypeName} (${s.penaltyAmount.toLocaleString('vi-VN')} đ)`,
                  description: s.legalBasis ?? '',
                }))}
            />
            {isLiveApi && !sanctionOptions.some((s) => s.legalBasis) && (
              <p role="alert" className="text-body-sm text-error">
                ⚠️ Hành vi này chưa có căn cứ pháp lý hoặc mức phạt hiệu lực vào ngày vi phạm. Cấu
                hình Biểu mức phạt trước khi ra quyết định.
              </p>
            )}
            <p className="text-body-xs text-muted">
              Mức áp dụng khi không có tình tiết giảm nhẹ/tăng nặng (Luật XLVPHC Điều 23 khoản 4).
            </p>

            <p className="mt-3 text-body-xs font-semibold text-muted">
              Người ký quyết định (Chủ tịch/Phó Chủ tịch UBND Phường hoặc người được uỷ quyền —
              không phải cán bộ lập biên bản)
            </p>
            {sanctionAuthorityTitle === undefined ? (
              <p role="status" className="text-body-sm text-muted">
                Đang kiểm tra thẩm quyền tài khoản…
              </p>
            ) : sanctionAuthorityTitle ? (
              <Card>
                <p className="text-body-sm text-foreground">
                  Ký với tư cách: <strong>{sanctionAuthorityTitle}</strong>
                </p>
              </Card>
            ) : (
              <p role="alert" className="text-body-sm text-error">
                ⚠️ Tài khoản của bạn chưa được giao thẩm quyền ký quyết định xử phạt. Chỉ Chủ tịch,
                Phó Chủ tịch UBND phường hoặc người được uỷ quyền bằng văn bản mới được ký.
              </p>
            )}

            <TextField
              label="Ghi chú thi hành quyết định"
              value={sanctionNotes}
              onChangeText={setSanctionNotes}
              multiline
              placeholder="Thời hạn chấp hành nộp phạt vào Kho bạc Nhà nước..."
            />

            {explanationBlockedMessage ? (
              <Card>
                <p role="alert" className="text-body-sm text-error">
                  ⚠️ {explanationBlockedMessage}
                </p>
                <label className="mt-2 flex cursor-pointer items-start gap-sm">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={acknowledgeEarlySanction}
                    onChange={(e) => setAcknowledgeEarlySanction(e.target.checked)}
                  />
                  <span className="text-body-sm text-text">
                    Tôi xác nhận vẫn ra quyết định xử phạt ngay dù còn thời hạn giải trình.
                  </span>
                </label>
              </Card>
            ) : null}
          </Section>
        </div>
      )}
    </Screen>
  );
}
