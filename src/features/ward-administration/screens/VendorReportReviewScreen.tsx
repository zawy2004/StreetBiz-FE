import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ErrorState, showToast } from '@/components/feedback';
import { isLiveApi } from '@/core/config/env';
import { PriceEvidenceBlock } from '@/features/vendor-reports/components/PriceEvidenceBlock';
import { SUGGESTED_VIOLATION_LABELS } from '@/features/vendor-reports/report-kinds';
import { useMockDb } from '@/mocks/db';
import { parseServerDate } from '../components/review/format';
import {
  CitizenReportSlip,
  MockDataNotice,
  ReportedVendorCard,
  ReportPhoto,
} from '../components/review/ReportParts';
import {
  VendorReportFacts,
  VendorReportOutcomeCard,
  VendorReportResolvePanel,
} from '../components/review/VendorReportDecision';
import { violationFormPath } from '../vendor-report-view';
import { LiveVendorReportReviewScreen } from './LiveVendorReportReviewScreen';

const SUGGESTED_BY_TYPE: Record<string, string> = {
  OVERCHARGE: 'PRICE_ABOVE_POSTED',
  PRICE_NOT_POSTED: 'PRICE_NOT_POSTED',
};

/** Against the backend the report comes from the ward's real reports; the mock screen is the no-backend demo. */
export function VendorReportReviewScreen() {
  return isLiveApi ? <LiveVendorReportReviewScreen /> : <MockVendorReportReviewScreen />;
}

function MockVendorReportReviewScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const report = useMockDb((s) => s.reports.find((r) => r.id === id));
  const vendors = useMockDb((s) => s.vendors);
  const resolveReport = useMockDb((s) => s.resolveReport);

  if (!report)
    return (
      <Screen>
        <ErrorState message="Không tìm thấy phản ánh." />
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

  const vendor = vendors.find((v) => v.id === report.vendorId);
  const due = parseServerDate(report.due_at);
  const pending = report.report_status === 'PENDING';
  const e = report.price_evidence;
  const evidence = e
    ? {
        menuItemId: 0,
        itemName: e.itemName,
        priceUnit: e.priceUnit,
        postedUnitPrice: e.postedUnitPrice,
        priceVersion: e.priceVersion,
        priceVersionAt: e.priceVersionAt,
        quantity: e.quantity,
        postedAmount: e.postedUnitPrice * e.quantity,
        chargedAmount: e.chargedAmount,
        difference: e.chargedAmount - e.postedUnitPrice * e.quantity,
        purchasedAt: e.purchasedAt,
      }
    : null;
  const suggestedCode = SUGGESTED_BY_TYPE[report.report_type ?? 'GENERAL'];

  return (
    <Screen width="wide">
      <AppHeader
        title="Phản ánh về quầy"
        back
        subtitle={vendor?.business_name ?? 'Không rõ hộ kinh doanh'}
        right={<StatusChip code={report.report_status} />}
      />
      <MockDataNotice />
      <div className="grid items-start gap-md lg:grid-cols-2 xl:grid-cols-12 xl:gap-lg">
        <div className="flex flex-col gap-md lg:col-span-2 xl:col-span-7">
          <CitizenReportSlip reason={report.reason} createdAt={report.created_at} />
          {evidence ? <PriceEvidenceBlock evidence={evidence} /> : null}
        </div>
        <div className="flex flex-col gap-md lg:col-span-2 xl:col-span-5">
          <VendorReportFacts
            reportType={report.report_type}
            status={report.report_status}
            dueAt={report.due_at}
            isOverdue={pending && due != null && due.getTime() < Date.now()}
            reportsAgainstVendor90Days={undefined}
          />
          {pending ? (
            <VendorReportResolvePanel
              chargedAmount={e?.chargedAmount ?? null}
              suggestedViolation={
                suggestedCode ? (SUGGESTED_VIOLATION_LABELS[suggestedCode] ?? null) : null
              }
              submitting={false}
              error={null}
              onResolve={(outcome, note, refundAmount) => {
                resolveReport(report.id, { resolution: outcome, note, refundAmount });
                showToast(outcome === 'DISMISSED' ? 'Đã bác phản ánh' : 'Đã ghi nhận hòa giải');
              }}
              onRecordViolation={() =>
                navigate(
                  violationFormPath({
                    reportId: report.id,
                    vendorId: report.vendorId,
                    slotId: report.slotId,
                  }),
                )
              }
              onReload={() => undefined}
            />
          ) : report.resolution ? (
            <VendorReportOutcomeCard
              outcome={{
                resolution: report.resolution,
                note: report.resolution_note ?? null,
                refundAmount: report.refund_amount ?? null,
                reviewedAt: report.reviewed_at ?? null,
                reviewedByName: null,
              }}
            />
          ) : null}
          <ReportPhoto uri={report.photoUri} vendorName={vendor?.business_name} />
          <ReportedVendorCard vendor={vendor} />
        </div>
      </div>
    </Screen>
  );
}
