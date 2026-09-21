import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Button, Card } from '@/components/common';
import { PhotoPicker, SelectField, TextField } from '@/components/forms';
import { AppHeader, Screen, Section, StickyActions } from '@/components/layout';
import { AiHint } from '@/components/status';
import { showToast } from '@/components/feedback';
import { isLiveApi } from '@/core/config/env';
import { useMockDb } from '@/mocks/db';
import {
  complianceApi,
  violationTypeLabels,
  type PenaltyScheduleItem,
  type WardViolationDetail,
} from '../ward-api';

export function RecordViolationScreen() {
  const [searchParams] = useSearchParams();
  const paramContractId = searchParams.get('contractId') ?? undefined;
  const paramSlotId = searchParams.get('slotId') ?? undefined;
  const paramVendorId = searchParams.get('vendorId') ?? undefined;

  const navigate = useNavigate();
  const vendors = useMockDb((s) => s.vendors);
  const recordViolationMock = useMockDb((s) => s.recordViolation);

  // Form State
  const [vendorId, setVendorId] = useState(paramVendorId ?? vendors[0]?.id ?? '');
  const [slotId] = useState(paramSlotId ?? '');
  const [contractId] = useState(paramContractId ?? '');
  const [typeCode, setTypeCode] = useState('UNAUTHORIZED_BUSINESS_USE');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string>();
  const [photoFileUrl, setPhotoFileUrl] = useState<string>();
  const [photoUploading, setPhotoUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Live penalty schedules from DB
  const [schedules, setSchedules] = useState<PenaltyScheduleItem[]>([]);
  const [createdViolation, setCreatedViolation] = useState<WardViolationDetail | null>(null);

  // Step 2: Sanction Form State (WARD-13 authority split: the patrolling officer above does
  // not have sanction authority -- only the Chairman/Vice-Chairman or a written delegate does)
  const [decisionNumber, setDecisionNumber] = useState('');
  const [sanctionScheduleId, setSanctionScheduleId] = useState<number | null>(null);
  const [signerName, setSignerName] = useState('');
  const [signerTitle, setSignerTitle] = useState('Chủ tịch UBND Phường');
  const [sanctionNotes, setSanctionNotes] = useState('');
  const [sanctioning, setSanctioning] = useState(false);

  useEffect(() => {
    if (!isLiveApi) return;
    complianceApi
      .listPenaltySchedules()
      .then((data) => {
        setSchedules(data);
        if (data.length > 0 && data[0]) {
          setTypeCode(data[0].violationType);
          setSanctionScheduleId(data[0].scheduleId);
        }
      })
      .catch((err) => console.warn('Could not load penalty schedules:', err));
  }, []);

  const selectedSchedule = schedules.find((s) => s.violationType === typeCode);

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
        });
        setCreatedViolation(res);
        if (res.aiSuggestion?.penaltyScheduleId) {
          setSanctionScheduleId(res.aiSuggestion.penaltyScheduleId);
        }
        showToast('Đã lập biên bản vi phạm (Bước 1/2). Tiếp tục ra Quyết định xử phạt nếu có thẩm quyền.');
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
      penaltyScheduleId: selectedSchedule?.scheduleId ?? 1,
      legalBasis: selectedSchedule?.legalBasis ?? 'Nghị định 168/2024/NĐ-CP',
      suggestedPenaltyAmount: selectedSchedule?.penaltyAmount ?? 2500000,
      hanhViViPham: `Hành vi: ${violationTypeLabels[typeCode] || typeCode}.`,
      bienPhapKhacPhuc: 'Buộc khôi phục lại tình trạng ban đầu, thu dọn vật dụng lấn chiếm trong thời hạn cán bộ ấn định.',
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
    const schedId = sanctionScheduleId ?? selectedSchedule?.scheduleId ?? schedules[0]?.scheduleId;
    if (!schedId) {
      showToast('Vui lòng chọn khung phạt áp dụng');
      return;
    }

    if (!signerName.trim() || !signerTitle.trim()) {
      showToast('Vui lòng nhập tên và chức danh người ký quyết định (Chủ tịch/Phó Chủ tịch UBND Phường)');
      return;
    }

    setSanctioning(true);
    try {
      if (isLiveApi) {
        await complianceApi.sanctionViolation(
          createdViolation.violationId,
          schedId,
          decisionNumber.trim(),
          signerName.trim(),
          signerTitle.trim(),
          sanctionNotes.trim() || undefined,
        );
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
      showToast(err instanceof Error ? err.message : 'Lỗi ban hành quyết định xử phạt');
    } finally {
      setSanctioning(false);
    }
  };

  return (
    <Screen
      footer={
        <StickyActions>
          {!createdViolation ? (
            <Button
              label={photoUploading ? 'Đang tải ảnh lên...' : loading ? 'Đang lập biên bản...' : 'Lập biên bản vi phạm (Bước 1)'}
              variant="danger"
              disabled={loading || photoUploading || !description.trim()}
              onPress={submitRecord}
            />
          ) : (
            <div className="flex w-full gap-sm">
              <div className="flex-1">
                <Button label="Hoàn tất (Chờ xử phạt sau)" variant="outline" onPress={() => navigate(-1)} />
              </div>
              <div className="flex-1">
                <Button
                  label={sanctioning ? 'Đang ban hành...' : 'Ban hành Quyết định (Bước 2)'}
                  variant="approve"
                  disabled={sanctioning || !decisionNumber.trim()}
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
              <SelectField
                value={vendorId}
                onChange={setVendorId}
                options={vendors.map((v) => ({ value: v.id, label: `${v.business_name} (${v.phone})` }))}
              />
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
                      description: `${s.penaltyAmount.toLocaleString('vi-VN')} đ · ${s.legalBasis || 'Nghị định 168/2024/NĐ-CP'}`,
                    }))
                  : Object.keys(violationTypeLabels).map((key) => ({
                      value: key,
                      label: violationTypeLabels[key] || key,
                      description: 'Căn cứ Nghị định 168/2024/NĐ-CP',
                    }))
              }
            />
          </Section>

          {selectedSchedule?.legalBasis ? (
            <Card>
              <p className="text-body-xs font-semibold text-muted">CĂN CỨ PHÁP LÝ ÁP DỤNG:</p>
              <p className="mt-1 text-body-sm text-foreground">{selectedSchedule.legalBasis}</p>
              <p className="mt-1 text-headline-sm font-bold text-danger">
                Khung phạt: {selectedSchedule.penaltyAmount.toLocaleString('vi-VN')} đ
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
                  setDescription('Hộ kinh doanh kê 3 bộ bàn ghế nhựa và 1 biển hiệu đứng lấn ra ngoài vạch sơn 45cm trên vỉa hè đường Nguyễn Văn Linh, cản trở lối đi của người đi bộ.');
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
              label={photoUploading ? 'Đang tải ảnh lên...' : 'Ảnh chụp hiện trường / Tang vật vi phạm'}
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
                    .catch((err: unknown) => showToast(err instanceof Error ? err.message : 'Tải ảnh lên thất bại'))
                    .finally(() => setPhotoUploading(false));
                }
              }}
              onRemove={() => {
                setPhotoUri(undefined);
                setPhotoFileUrl(undefined);
              }}
            />
          </Section>

          <Card>
            <p className="text-body-sm text-muted">
              * Quy trình 2 bước: Cán bộ tuần tra lập biên bản xác nhận hành vi vi phạm tại hiện trường (`PENDING_SANCTION`). Sau đó, <strong>Chủ tịch/Phó Chủ tịch UBND Phường</strong> (hoặc người được uỷ quyền bằng văn bản — cán bộ lập biên bản không có thẩm quyền này) ký Quyết định xử phạt (`SANCTIONED`) với số tiền lấy từ khung do Phường cấu hình (`PenaltyFeeSchedules`).
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
          </div>

          {/* AI Legal Co-pilot -- Mau MBB01 (Nghị định 118/2021/NĐ-CP) structure.
              LegalBasis and SuggestedPenaltyAmount always come from the ward's own
              PenaltyFeeSchedules row on the backend, never AI-authored text. */}
          {createdViolation.aiSuggestion ? (
            <AiHint title={createdViolation.aiSuggestion.isAiGenerated ? 'Trợ lý Pháp lý [AI]' : 'Trợ lý Pháp lý [Hệ thống — chưa xác minh bằng AI]'}>
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
                    Mức phạt: {createdViolation.aiSuggestion.suggestedPenaltyAmount.toLocaleString('vi-VN')} đ
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
              options={schedules.map((s) => ({
                value: String(s.scheduleId),
                label: `${s.violationTypeName} (${s.penaltyAmount.toLocaleString('vi-VN')} đ)`,
                description: s.legalBasis || 'Nghị định 168/2024/NĐ-CP',
              }))}
            />

            <p className="mt-3 text-body-xs font-semibold text-muted">
              Người ký quyết định (Chủ tịch/Phó Chủ tịch UBND Phường hoặc người được uỷ quyền — không phải cán bộ lập biên bản) *
            </p>
            <TextField label="Họ tên người ký *" value={signerName} onChangeText={setSignerName} placeholder="Nguyễn Văn A" />
            <TextField
              label="Chức danh *"
              value={signerTitle}
              onChangeText={setSignerTitle}
              placeholder="Chủ tịch UBND Phường"
            />

            <TextField
              label="Ghi chú thi hành quyết định"
              value={sanctionNotes}
              onChangeText={setSanctionNotes}
              multiline
              placeholder="Thời hạn chấp hành nộp phạt vào Kho bạc Nhà nước..."
            />
          </Section>
        </div>
      )}
    </Screen>
  );
}
