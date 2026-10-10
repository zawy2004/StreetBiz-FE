import { useNavigate, useParams } from 'react-router-dom';

import { Button, Icon } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { ErrorState, showToast } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';
import {
  CitizenReportSlip,
  MockDataNotice,
  ReportedVendorCard,
  ReportPhoto,
  ResolutionPath,
} from '../components/review/ReportParts';

export function VendorReportReviewScreen() {
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

  return (
    <Screen
      footer={
        <StickyActions>
          <ResolutionPath id="report-path-violation" note="Mở biểu mẫu biên bản (chưa điền sẵn hộ)">
            <Button
              label="Lập biên bản vi phạm"
              variant="outline"
              icon={<Icon name="gavel" size={19} color="currentColor" />}
              onPress={() => navigate('/ward/patrol/violations/new')}
            />
          </ResolutionPath>
          <ResolutionPath id="report-path-resolve" note="Đóng phản ánh, không lập biên bản">
            <Button
              label="Đánh dấu đã xử lý"
              variant="approve"
              icon={<Icon name="check-circle-outline" size={19} color="currentColor" />}
              onPress={() => {
                resolveReport(report.id);
                showToast('Đã xử lý phản ánh');
                navigate(-1);
              }}
            />
          </ResolutionPath>
        </StickyActions>
      }
    >
      <AppHeader
        title="Phản ánh vi phạm"
        back
        subtitle={vendor?.business_name ?? 'Không rõ hộ kinh doanh'}
        right={<StatusChip code={report.report_status} />}
      />
      <MockDataNotice />
      <div className="grid items-start gap-md lg:grid-cols-2 xl:grid-cols-12 xl:gap-lg">
        <div className="lg:col-span-2 xl:col-span-7">
          <CitizenReportSlip reason={report.reason} createdAt={report.created_at} />
        </div>
        <div className="flex flex-col gap-md lg:col-span-2 lg:grid lg:grid-cols-2 xl:col-span-5 xl:flex xl:flex-col">
          <ReportPhoto uri={report.photoUri} vendorName={vendor?.business_name} />
          <ReportedVendorCard vendor={vendor} />
        </div>
      </div>
    </Screen>
  );
}
