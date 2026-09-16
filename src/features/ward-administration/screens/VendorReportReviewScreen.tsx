import { useNavigate, useParams } from 'react-router-dom';

import { Button, Card } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, showToast } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';

export function VendorReportReviewScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const report = useMockDb((s) => s.reports.find((r) => r.id === id));
  const vendors = useMockDb((s) => s.vendors);
  const resolveReport = useMockDb((s) => s.resolveReport);

  if (!report) return <ErrorState message="Không tìm thấy phản ánh." />;

  const vendor = vendors.find((v) => v.id === report.vendorId);

  return (
    <Screen
      footer={
        <StickyActions>
          <div className="flex-1">
            <Button
              label="Lập biên bản vi phạm"
              variant="outline"
              onPress={() => navigate('/ward/patrol/violations/new')}
            />
          </div>
          <div className="flex-1">
            <Button
              label="Đánh dấu đã xử lý"
              variant="approve"
              onPress={() => {
                resolveReport(report.id);
                showToast('Đã xử lý phản ánh');
                navigate(-1);
              }}
            />
          </div>
        </StickyActions>
      }
    >
      <AppHeader
        title="Phản ánh vi phạm"
        back
        subtitle={vendor?.business_name ?? 'Không rõ hộ kinh doanh'}
      />
      <Card>
        <p className="text-body-md text-muted">Nội dung phản ánh</p>
        <p className="mt-1 text-headline-sm text-text">{report.reason}</p>
        <p className="mt-2 text-body-sm text-muted">
          Gửi lúc {new Date(report.created_at).toLocaleString('vi-VN')}
        </p>
      </Card>
    </Screen>
  );
}
