import { useEffect, useId, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Button, Icon } from '@/components/common';
import { FormGrid, SegmentedControl, SelectField, TextField } from '@/components/forms';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { AiHint } from '@/components/status';
import { showToast } from '@/components/feedback';
import { VERDICT_TONES } from '@/components/illustrations';
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
import {
  CaseFact,
  CaseRail,
  CaseStrip,
  PenaltyPlacard,
  RecordChecklist,
  SlotPlate,
  StepSpine,
  ThresholdGauge,
  type ChecklistItem,
} from '../components/ops/violation/CaseRail';
import type { Choice } from '../components/ops/violation/ChoiceList';
import { EvidenceFrame, type EvidenceStatus } from '../components/ops/violation/EvidenceFrame';
import {
  DeliveryPanel,
  EarlySanctionBlock,
  ExplanationPanel,
  Outcome,
  RevocationAdvisory,
  SanctionAmount,
  SignerBlock,
} from '../components/ops/violation/FollowUpPanels';
import { VendorPicker } from '../components/ops/violation/VendorPicker';
import { SheetSection, ViolationSheet } from '../components/ops/violation/ViolationSheet';
import { ViolationTypePicker } from '../components/ops/violation/ViolationTypePicker';
import { daysUntil } from '../components/ops/violation/violation-utils';

const PENDING = VERDICT_TONES.pending;
const NEUTRAL = VERDICT_TONES.neutral;

/**
 * WARD-12 two-step violation handling, drawn as a numbered paper record (Mẫu 01)
 * with the case file beside it. Step 1 records the violation (PENDING_SANCTION);
 * step 2 is the sanction decision, signed only by an account with sanction
 * authority. AI text is advisory and labelled; nothing here fines on its own.
 */
export function RecordViolationScreen() {
  const [searchParams] = useSearchParams();
  const paramContractId = searchParams.get('contractId') ?? undefined;
  const paramSlotId = searchParams.get('slotId') ?? undefined;
  const paramVendorId = searchParams.get('vendorId') ?? undefined;

  const navigate = useNavigate();
  const vendors = useMockDb((s) => s.vendors);
  const recordViolationMock = useMockDb((s) => s.recordViolation);
  // Demo mode only: the slot plate for the case file, read from the mock store already in memory.
  const mockSlots = useMockDb((s) => s.slots);

  // Live mode: the vendor picker must list real vendor_id values from the server, not the mock
  // store -- submitting a mock id against the live API fails with a foreign-key error (vendor_id
  // doesn't exist), the "An unexpected error occurred" an officer would otherwise hit here.
  const [liveVendors, setLiveVendors] = useState<
    { vendorId: number; displayName: string; ownerName: string }[]
  >([]);
  useEffect(() => {
    if (!isLiveApi || paramVendorId) return;
    complianceApi
      .listEnrollments('APPROVED')
      .then((items) =>
        setLiveVendors(
          items.map((i) => ({
            vendorId: i.vendorId,
            displayName: i.displayName,
            ownerName: i.ownerName,
          })),
        ),
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
  // Display only: the slot's code and zone from the same slot-grid answer, for the slot plate.
  const [slotPlate, setSlotPlate] = useState<{ slotCode: string; zoneName: string } | null>(null);
  useEffect(() => {
    if (!isLiveApi || !slotId) return;
    Promise.all([wardConfigApi.slotGrid(), wardConfigApi.listZones()])
      .then(([grid, zones]) => {
        const slot = grid.slots.find((s) => s.slotId === Number(slotId));
        if (slot) setSlotPlate({ slotCode: slot.slotCode, zoneName: slot.zoneName });
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
  const [sanctionAuthorityTitle, setSanctionAuthorityTitle] = useState<string | null | undefined>(
    undefined,
  );
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

  // Display only: "Áp dụng khung này" briefly rings the frame it filled in (nothing is sent).
  const [flashSanction, setFlashSanction] = useState(false);
  useEffect(() => {
    if (!flashSanction) return;
    const timer = window.setTimeout(() => setFlashSanction(false), 900);
    return () => window.clearTimeout(timer);
  }, [flashSanction]);

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

  /* ------------------------------------------------------------------------
   * Presentation only from here: everything below is derived from state the
   * screen already holds; nothing is fetched, sent or decided.
   * --------------------------------------------------------------------- */
  const ids = {
    vendor: useId(),
    type: useId(),
    scene: useId(),
    witness: useId(),
    containment: useId(),
    explanation: useId(),
    delivery: useId(),
    explanation2: useId(),
    decision: useId(),
  };

  const vendorChoices = useMemo<Choice[]>(
    () =>
      isLiveApi
        ? liveVendors.map((v) => ({
            value: String(v.vendorId),
            label: v.displayName,
            aside: `(${v.ownerName})`,
          }))
        : vendors.map((v) => ({ value: v.id, label: v.business_name, aside: `(${v.phone})` })),
    [liveVendors, vendors],
  );
  const vendorName = vendorChoices.find((c) => c.value === vendorId)?.label;

  const mockSlot = !isLiveApi && slotId ? mockSlots.find((s) => s.id === slotId) : undefined;
  const plate = createdViolation?.slotCode
    ? {
        slotCode: createdViolation.slotCode,
        place: slotPlate?.zoneName ?? mockSlot?.street ?? null,
      }
    : slotPlate
      ? { slotCode: slotPlate.slotCode, place: slotPlate.zoneName }
      : mockSlot
        ? { slotCode: mockSlot.slot_code, place: mockSlot.street }
        : null;

  const photoStatus: EvidenceStatus = !photoUri
    ? 'idle'
    : photoUploading
      ? 'uploading'
      : !isLiveApi
        ? 'local'
        : photoFileUrl
          ? 'saved'
          : 'failed';

  const checklist: ChecklistItem[] = [
    {
      label: 'Hộ kinh doanh vi phạm',
      state: vendorId ? 'done' : 'todo',
      note: vendorName ?? (paramVendorId ? `Mã hộ ${paramVendorId}` : undefined),
    },
    {
      label: 'Hành vi và căn cứ pháp lý',
      state: selectedSchedule && !selectedSchedule.legalBasis ? 'fail' : 'done',
      note:
        selectedSchedule && !selectedSchedule.legalBasis
          ? 'Thiếu căn cứ: chỉ lập được biên bản'
          : undefined,
    },
    {
      label: 'Mô tả hành vi tại hiện trường',
      state: description.trim() ? 'done' : 'todo',
      note: description.trim() ? undefined : 'Cần có trước khi lập biên bản',
    },
    {
      label: 'Ảnh hiện trường',
      state:
        photoStatus === 'idle'
          ? 'todo'
          : photoStatus === 'uploading'
            ? 'busy'
            : photoStatus === 'failed'
              ? 'fail'
              : 'done',
      note:
        photoStatus === 'idle'
          ? 'Nên có ảnh tang vật'
          : photoStatus === 'uploading'
            ? 'Đang tải ảnh lên...'
            : photoStatus === 'failed'
              ? 'Tải lên thất bại. Xoá ảnh rồi chọn lại.'
              : undefined,
    },
    {
      label: 'Người chứng kiến',
      state: witnessName.trim() ? 'done' : 'optional',
      note: witnessName.trim() || 'Chỉ cần khi người vi phạm vắng mặt hoặc không ký',
    },
    {
      label: 'Quyền giải trình',
      state: explanationRequired ? 'done' : 'optional',
      note: explanationRequired
        ? explanationMethod === 'DIRECT'
          ? 'Trực tiếp (2 ngày làm việc)'
          : 'Bằng văn bản (5 ngày làm việc)'
        : 'Không thuộc trường hợp giải trình',
    },
  ];
  const checklistDone = checklist.filter((c) => c.state === 'done').length;

  const step1Placard = selectedSchedule
    ? selectedSchedule.legalBasis
      ? {
          state: 'amount' as const,
          amount: selectedSchedule.penaltyAmount,
          legalBasis: selectedSchedule.legalBasis,
          caption: 'Mức trung bình khung, không nhập tay.',
        }
      : {
          state: 'missing' as const,
          amount: null,
          legalBasis: null,
          caption: 'Lập được biên bản nhưng chưa thể ra quyết định xử phạt tiền.',
        }
    : {
        state: 'unknown' as const,
        amount: null,
        legalBasis: schedules.length === 0 ? 'Căn cứ Nghị định 168/2024/NĐ-CP' : null,
        caption: 'Biểu mức phạt của phường chưa tải được.',
      };

  const chosenSanction = sanctionOptions.find(
    (s) => s.scheduleId === sanctionScheduleId && s.legalBasis,
  );
  const step2Placard = chosenSanction
    ? {
        state: 'amount' as const,
        amount: chosenSanction.penaltyAmount,
        legalBasis: chosenSanction.legalBasis,
        caption: 'Mức áp dụng khi không có tình tiết giảm nhẹ/tăng nặng.',
      }
    : isLiveApi && !sanctionOptions.some((s) => s.legalBasis)
      ? {
          state: 'missing' as const,
          amount: null,
          legalBasis: null,
          caption: 'Cấu hình Biểu mức phạt trước khi ra quyết định.',
        }
      : {
          state: 'unknown' as const,
          amount: null,
          legalBasis: null,
          caption: 'Chọn khung xử phạt trong phần Quyết định.',
        };
  const placard = createdViolation ? step2Placard : step1Placard;
  const placardTitle = createdViolation ? 'Khung xử phạt đang chọn' : 'Mức phạt (trung bình khung)';

  const noAuthority = isLiveApi && sanctionAuthorityTitle === null;
  const explanationDaysLeft =
    createdViolation?.explanationRequired &&
    createdViolation.explanationDeadlineAt &&
    !createdViolation.explanationReceivedAt
      ? daysUntil(createdViolation.explanationDeadlineAt)
      : null;

  const placardNode = (
    <PenaltyPlacard
      title={placardTitle}
      amount={placard.amount}
      legalBasis={placard.legalBasis}
      state={placard.state}
      caption={placard.caption}
      fadeKey={`${placard.state}-${placard.amount ?? ''}-${createdViolation ? 'd' : typeCode}`}
    />
  );

  const factsNode = (
    <div className="flex flex-col gap-sm">
      {plate ? (
        <CaseFact label="Ô vỉa hè">
          <SlotPlate slotCode={plate.slotCode} place={plate.place} />
        </CaseFact>
      ) : null}
      <CaseFact label="Hộ kinh doanh">
        {createdViolation
          ? (createdViolation.vendorName ?? 'Chưa xác định')
          : (vendorName ?? (paramVendorId ? `Mã hộ ${paramVendorId}` : 'Chưa chọn'))}
      </CaseFact>
      {createdViolation ? (
        <CaseFact label="Hành vi">{createdViolation.violationTypeName}</CaseFact>
      ) : null}
    </div>
  );

  const historyNode = createdViolation ? (
    <div className="flex flex-col gap-sm rounded-[18px] bg-sunken/60 p-sm">
      <p className="text-[16px] leading-snug text-text">
        <span className="font-sign text-[24px] font-extrabold [font-stretch:86%]">
          {createdViolation.recentViolationCount90Days}
        </span>{' '}
        lần vi phạm trong 90 ngày
      </p>
      {createdViolation.complianceFlag.violationThreshold !== null ? (
        <ThresholdGauge
          count={createdViolation.complianceFlag.sanctionedViolationCount}
          threshold={createdViolation.complianceFlag.violationThreshold}
        />
      ) : null}
      {explanationDaysLeft !== null ? (
        <p
          className={`flex items-center gap-1.5 rounded-full px-sm py-1 text-label ${PENDING.wash} ${PENDING.ink}`}
        >
          <Icon name="timer-outline" size={16} color="currentColor" />
          Hạn giải trình:{' '}
          {explanationDaysLeft > 0 ? `còn ${explanationDaysLeft} ngày` : 'đã hết hạn'}
        </p>
      ) : null}
    </div>
  ) : null;

  const amountSummary =
    placard.state === 'amount' && placard.amount !== null
      ? `${placard.amount.toLocaleString('vi-VN')} đ`
      : placard.state === 'missing'
        ? 'Thiếu căn cứ'
        : 'Chưa có mức';

  return (
    <Screen
      width="wide"
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

      <div className="grid items-start gap-md xl:grid-cols-[minmax(0,1fr)_336px] xl:gap-xl">
        {/* <1280: the steps in one line and the case file folded into a strip over the sheet. */}
        <CaseStrip
          spine={<StepSpine step={createdViolation ? 2 : 1} compact />}
          summary={
            <>
              {plate ? <SlotPlate slotCode={plate.slotCode} size="sm" /> : null}
              <span className="text-body-md text-muted">
                Mức phạt{' '}
                <span className="font-tabular font-sign text-[18px] font-extrabold text-[#8F1717] [font-stretch:86%] dark:text-[#FF9A90]">
                  {amountSummary}
                </span>
              </span>
              {createdViolation ? (
                explanationDaysLeft !== null ? (
                  <span className={`text-label ${PENDING.ink}`}>
                    Giải trình:{' '}
                    {explanationDaysLeft > 0 ? `còn ${explanationDaysLeft} ngày` : 'đã hết hạn'}
                  </span>
                ) : null
              ) : (
                <span className="text-label text-text">
                  Bảng kiểm {checklistDone}/{checklist.length} mục
                </span>
              )}
            </>
          }
        >
          <StepSpine step={createdViolation ? 2 : 1} noAuthority={noAuthority} />
          <div className="flex flex-col gap-md">
            {factsNode}
            {historyNode}
          </div>
        </CaseStrip>

        <ViolationSheet
          recordNumber={
            createdViolation
              ? (createdViolation.bienBanSo ?? `#${createdViolation.violationId}`)
              : null
          }
          busy={loading || sanctioning}
          headDetails={
            createdViolation ? (
              <div className="flex flex-col gap-sm md:flex-row md:items-end md:justify-between">
                <div className="flex min-w-0 flex-col gap-xs">
                  <p className="flex items-center gap-1.5 text-[16px] font-semibold text-[#0B5D33] dark:text-[#8BE3B0]">
                    <Icon name="check-circle" size={20} color="currentColor" weight="fill" />
                    Đã lập biên bản vi phạm #{createdViolation.violationId}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-xs gap-y-1 text-body-md text-text">
                    Trạng thái hiện tại:{' '}
                    <strong
                      className={`rounded-[6px] px-xs py-0.5 font-semibold ${PENDING.wash} ${PENDING.ink}`}
                    >
                      Chờ ra quyết định xử phạt (PENDING_SANCTION)
                    </strong>
                  </p>
                  {createdViolation.bienBanSo ? (
                    <p className="text-body-md text-muted">
                      Số biên bản:{' '}
                      <strong className="font-sign font-semibold tracking-[0.02em] text-text">
                        {createdViolation.bienBanSo}
                      </strong>
                      {createdViolation.preparedLocation
                        ? ` · Nơi lập: ${createdViolation.preparedLocation}`
                        : ''}
                    </p>
                  ) : null}
                </div>
                {isLiveApi && (
                  <Button
                    label={downloadingDocument ? 'Đang tải...' : 'Tải biên bản (.docx)'}
                    variant="outline"
                    fullWidth={false}
                    icon={<Icon name="file-document-outline" size={18} color="currentColor" />}
                    disabled={downloadingDocument}
                    onPress={downloadDocument}
                  />
                )}
              </div>
            ) : null
          }
        >
          {/* STEP 1: RECORD VIOLATION */}
          {!createdViolation ? (
            <>
              <SheetSection index={1} id={ids.vendor} title="Hộ kinh doanh vi phạm">
                {!paramVendorId ? (
                  <VendorPicker
                    value={vendorId}
                    onChange={setVendorId}
                    choices={vendorChoices}
                    loading={isLiveApi && liveVendors.length === 0}
                    labelledBy={ids.vendor}
                  />
                ) : (
                  <div
                    className={`flex flex-wrap items-center gap-sm rounded-[14px] px-sm py-sm ${NEUTRAL.wash}`}
                  >
                    <Icon
                      name="storefront-outline"
                      size={22}
                      color="currentColor"
                      className={`shrink-0 ${NEUTRAL.ink}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[16px] font-semibold text-text">Mã hộ {paramVendorId}</p>
                      <p className="text-body-sm text-muted">
                        Đã xác định từ kết quả kiểm tra giấy phép tại quầy.
                      </p>
                    </div>
                    {plate ? <SlotPlate slotCode={plate.slotCode} place={plate.place} /> : null}
                  </div>
                )}
              </SheetSection>

              <SheetSection
                index={2}
                id={ids.type}
                title="Hành vi vi phạm"
                description="Căn cứ pháp lý luật hiện hành 2026"
              >
                <ViolationTypePicker
                  value={typeCode}
                  onChange={setTypeCode}
                  schedules={schedules}
                  fallbackLabels={violationTypeLabels}
                  labelledBy={ids.type}
                />

                {typeCode === 'OUTSIDE_HOURS' && zoneHoursText && (
                  <div className={`flex gap-sm rounded-[16px] p-md ${NEUTRAL.wash}`}>
                    <Icon
                      name="clock-outline"
                      size={22}
                      color="currentColor"
                      className={`mt-0.5 shrink-0 ${NEUTRAL.ink}`}
                    />
                    <div className="min-w-0">
                      <p className={`text-body-sm font-semibold ${NEUTRAL.ink}`}>
                        Khung giờ hoạt động đã cấu hình cho khu vực này:
                      </p>
                      <p className="mt-0.5 font-tabular font-sign text-[22px] font-extrabold text-text [font-stretch:86%]">
                        {zoneHoursText}
                      </p>
                      <p className="mt-0.5 text-body-sm text-muted">
                        Chỉ để tham khảo — hệ thống không tự kiểm tra giờ, cán bộ vẫn quyết định dựa
                        trên hiện trường.
                      </p>
                    </div>
                  </div>
                )}

                {/* <1280 the fine sits right under the chosen violation; ≥1280 it is on the rail. */}
                <div className="xl:hidden">{placardNode}</div>
              </SheetSection>

              <SheetSection
                index={3}
                id={ids.scene}
                title="Mô tả hiện trường & Bằng chứng"
                action={
                  <button
                    type="button"
                    className="min-h-12 rounded-sm px-xs text-body-sm font-semibold text-primary hover:underline"
                    onClick={() => {
                      setTypeCode('UNAUTHORIZED_BUSINESS_USE');
                      setDescription(
                        'Hộ kinh doanh kê 3 bộ bàn ghế nhựa và 1 biển hiệu đứng lấn ra ngoài vạch sơn 45cm trên vỉa hè đường Nguyễn Văn Linh, cản trở lối đi của người đi bộ.',
                      );
                    }}
                  >
                    + Điền mô tả mẫu để thử nghiệm AI Co-pilot
                  </button>
                }
              >
                <TextField
                  label="Mô tả chi tiết vi phạm tại hiện trường"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  placeholder="Ví dụ: Bày bán hàng hóa, kê bàn ghế lấn chiếm 0.5m vỉa hè ngoài vạch kẻ cho phép, cản trở lối đi bộ..."
                />

                <EvidenceFrame
                  label={
                    photoUploading
                      ? 'Đang tải ảnh lên...'
                      : 'Ảnh chụp hiện trường / Tang vật vi phạm'
                  }
                  uri={photoUri}
                  status={photoStatus}
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
              </SheetSection>

              <SheetSection
                index={4}
                id={ids.witness}
                title="Người chứng kiến / Đại diện chính quyền"
                description="Nếu người vi phạm vắng mặt hoặc không ký"
              >
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
                    <FormGrid>
                      <TextField
                        label="Nghề nghiệp"
                        value={witnessOccupation}
                        onChangeText={setWitnessOccupation}
                      />
                      <TextField
                        label="Địa chỉ"
                        value={witnessAddress}
                        onChangeText={setWitnessAddress}
                      />
                    </FormGrid>
                  </>
                ) : null}
              </SheetSection>

              <SheetSection index={5} id={ids.containment} title="Biện pháp ngăn chặn (nếu có)">
                <TextField
                  label="Biện pháp đã áp dụng tại hiện trường"
                  value={containmentMeasures}
                  onChangeText={setContainmentMeasures}
                  multiline
                  placeholder="Ví dụ: Tạm giữ tang vật, yêu cầu chấm dứt ngay hành vi vi phạm..."
                />
              </SheetSection>

              <SheetSection
                index={6}
                id={ids.explanation}
                title="Quyền giải trình"
                description="Điều 61 Luật Xử lý vi phạm hành chính"
              >
                <label className="flex min-h-12 cursor-pointer items-center gap-sm rounded-[14px] border-[1.5px] border-border bg-card px-sm py-sm hover:border-text/30 has-[:checked]:border-primary has-[:checked]:bg-tint-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary">
                  <input
                    type="checkbox"
                    className="h-5 w-5 shrink-0 accent-[rgb(var(--c-primary))]"
                    checked={explanationRequired}
                    onChange={(e) => setExplanationRequired(e.target.checked)}
                  />
                  <span className="text-body-lg text-text">
                    Hành vi này thuộc trường hợp người vi phạm có quyền giải trình trước khi ra
                    quyết định xử phạt.
                  </span>
                </label>
                {explanationRequired ? (
                  <SegmentedControl
                    value={explanationMethod}
                    onChange={setExplanationMethod}
                    options={[
                      { value: 'DIRECT', label: 'Trực tiếp (2 ngày làm việc)' },
                      { value: 'WRITTEN', label: 'Bằng văn bản (5 ngày làm việc)' },
                    ]}
                  />
                ) : null}
              </SheetSection>

              {/* <1280: "check your answers" right above the submit bar; ≥1280 it is on the rail. */}
              <section aria-label="Bảng kiểm biên bản" className="px-md py-lg md:px-lg xl:hidden">
                <div className="flex flex-col gap-sm rounded-[18px] bg-sunken/60 p-md">
                  <p className="text-[16px] font-semibold text-text">
                    Biên bản đã đủ chưa?{' '}
                    <span className="font-normal text-muted">
                      {checklistDone}/{checklist.length} mục · chỉ để kiểm tra lại
                    </span>
                  </p>
                  <RecordChecklist items={checklist} />
                </div>
              </section>
            </>
          ) : (
            /* STEP 2: what the patrol officer does on the spot first, then the decision. */
            <>
              <SheetSection icon="send-outline" id={ids.delivery} title="Giao biên bản">
                <DeliveryPanel
                  violation={createdViolation}
                  deliveredToName={deliveredToName}
                  onDeliveredToName={setDeliveredToName}
                  refusalReason={deliveryRefusalReason}
                  onRefusalReason={setDeliveryRefusalReason}
                  submitting={submittingDelivery}
                  onDelivered={() => submitDelivery(false)}
                  onRefused={() => submitDelivery(true)}
                />
              </SheetSection>

              {createdViolation.explanationRequired ? (
                <SheetSection
                  icon="chat-outline"
                  id={ids.explanation2}
                  title="Quyền giải trình (Điều 61 Luật XLVPHC)"
                >
                  <ExplanationPanel
                    violation={createdViolation}
                    content={explanationContent}
                    onContent={setExplanationContent}
                    submitting={submittingExplanation}
                    onSubmit={submitExplanation}
                  />
                </SheetSection>
              ) : null}

              <SheetSection
                icon="gavel"
                id={ids.decision}
                title="Thông tin Quyết định xử phạt hành chính"
                description="Do người có thẩm quyền ký; mức phạt chọn từ biểu khung của Phường, không nhập tay."
              >
                <TextField
                  label="Số Quyết định xử phạt hành chính *"
                  value={decisionNumber}
                  onChangeText={setDecisionNumber}
                  placeholder="Ví dụ: 01/QĐ-XPHC-HC1"
                />

                <div
                  className={`-m-xs rounded-[20px] p-xs transition-shadow duration-500 ${
                    flashSanction
                      ? 'shadow-[0_0_0_3px_rgb(var(--c-brand)),0_0_0_9px_rgb(var(--c-brand)/0.16)]'
                      : 'shadow-none'
                  }`}
                >
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
                </div>
                <SanctionAmount amount={chosenSanction?.penaltyAmount ?? null} />
                {isLiveApi && !sanctionOptions.some((s) => s.legalBasis) && (
                  <Outcome tone="danger" icon="alert-octagon-outline" role="alert">
                    Hành vi này chưa có căn cứ pháp lý hoặc mức phạt hiệu lực vào ngày vi phạm. Cấu
                    hình Biểu mức phạt trước khi ra quyết định.
                  </Outcome>
                )}
                <p className="text-body-sm text-muted">
                  Mức áp dụng khi không có tình tiết giảm nhẹ/tăng nặng (Luật XLVPHC Điều 23 khoản
                  4).
                </p>

                <SignerBlock title={sanctionAuthorityTitle} />

                <TextField
                  label="Ghi chú thi hành quyết định"
                  value={sanctionNotes}
                  onChangeText={setSanctionNotes}
                  multiline
                  placeholder="Thời hạn chấp hành nộp phạt vào Kho bạc Nhà nước..."
                />

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
                    <p className="font-medium text-text">
                      {createdViolation.aiSuggestion.hanhViViPham}
                    </p>
                    <p className="mt-1 text-body-md text-text">
                      Biện pháp khắc phục: {createdViolation.aiSuggestion.bienPhapKhacPhuc}
                    </p>
                    <p className="mt-1 text-body-sm font-semibold text-text">
                      Căn cứ pháp lý (từ biểu khung Phường):{' '}
                      {createdViolation.aiSuggestion.legalBasis}
                    </p>
                    {createdViolation.aiSuggestion.suggestedPenaltyAmount ? (
                      <div className="mt-sm flex flex-wrap items-center justify-between gap-sm border-t border-secondary/40 pt-sm">
                        <span className="font-tabular text-[17px] font-bold text-[#8F1717] dark:text-[#FF9A90]">
                          Mức phạt:{' '}
                          {createdViolation.aiSuggestion.suggestedPenaltyAmount.toLocaleString(
                            'vi-VN',
                          )}{' '}
                          đ
                        </span>
                        <Button
                          label="Áp dụng khung này"
                          variant="outline"
                          fullWidth={false}
                          onPress={() => {
                            if (createdViolation.aiSuggestion?.penaltyScheduleId) {
                              setSanctionScheduleId(
                                createdViolation.aiSuggestion.penaltyScheduleId,
                              );
                            }
                            showToast('Đã áp dụng khung xử phạt vào quyết định');
                            setFlashSanction(true);
                          }}
                        />
                      </div>
                    ) : null}
                  </AiHint>
                ) : null}

                {(createdViolation.complianceFlag.violationThresholdReached ||
                  createdViolation.complianceFlag.hasOverduePenalty) && (
                  <RevocationAdvisory flag={createdViolation.complianceFlag} />
                )}

                {explanationBlockedMessage ? (
                  <EarlySanctionBlock
                    message={explanationBlockedMessage}
                    checked={acknowledgeEarlySanction}
                    onChecked={setAcknowledgeEarlySanction}
                  />
                ) : null}
              </SheetSection>
            </>
          )}
        </ViolationSheet>

        {/* ≥1280: the case file, sticky beside the sheet. */}
        <CaseRail>
          <StepSpine step={createdViolation ? 2 : 1} noAuthority={noAuthority} />
          <div className="h-px bg-border" aria-hidden="true" />
          {factsNode}
          {placardNode}
          {createdViolation ? (
            historyNode
          ) : (
            <div className="flex flex-col gap-sm">
              <p className="text-[16px] font-semibold text-text">
                Biên bản đã đủ chưa?{' '}
                <span className="font-normal text-muted">
                  {checklistDone}/{checklist.length}
                </span>
              </p>
              <RecordChecklist items={checklist} />
              <p className="text-body-sm text-muted">Chỉ để kiểm tra lại, không chặn việc lập.</p>
            </div>
          )}
        </CaseRail>
      </div>
    </Screen>
  );
}
