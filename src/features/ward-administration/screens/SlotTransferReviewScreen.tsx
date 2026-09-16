import { useNavigate, useParams } from 'react-router-dom';

import { Button, Card, Divider, ListRow } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState, showToast } from '@/components/feedback';
import { useMockDb } from '@/mocks/db';

export function SlotTransferReviewScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const transfer = useMockDb((s) => s.transfers.find((t) => t.id === id));
  const contract = useMockDb((s) => s.contracts.find((c) => c.id === transfer?.contractId));
  const slot = useMockDb((s) => s.slots.find((sl) => sl.id === contract?.slotId));
  const vendors = useMockDb((s) => s.vendors);
  const feeItems = useMockDb((s) => s.feeItems);
  const reviewTransfer = useMockDb((s) => s.reviewTransfer);

  if (!transfer) return <ErrorState message="Không tìm thấy yêu cầu." />;

  const fromVendor = vendors.find((v) => v.id === transfer.fromVendorId);
  const outstandingFees = feeItems.filter(
    (f) => f.contractId === transfer.contractId && f.item_status === 'PENDING',
  );

  const act = (approve: boolean) => {
    reviewTransfer(transfer.id, approve);
    showToast(approve ? 'Đã duyệt chuyển nhượng' : 'Đã từ chối chuyển nhượng');
    navigate(-1);
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <div className="flex-1">
            <Button label="Từ chối" variant="danger" onPress={() => act(false)} />
          </div>
          <div className="flex-1">
            <Button
              label="Duyệt chuyển nhượng"
              variant="approve"
              onPress={() => act(true)}
              disabled={!transfer.toVendorId}
            />
          </div>
        </StickyActions>
      }
    >
      <AppHeader title="Duyệt chuyển nhượng ô" back subtitle={slot?.slot_code} />
      <Card padded={false}>
        <div className="px-md">
          <ListRow title="Bên chuyển nhượng" subtitle={fromVendor?.business_name} />
          <Divider />
          <ListRow title="Bên nhận" subtitle={transfer.toVendorPhone} />
        </div>
      </Card>
      {outstandingFees.length > 0 ? (
        <Card style={{ backgroundColor: '#FFDAD614', borderColor: '#BA1A1A33' }}>
          <p className="text-body-md text-error">
            Hợp đồng còn {outstandingFees.length} khoản phí chưa thanh toán.
          </p>
        </Card>
      ) : null}
      {!transfer.toVendorId ? (
        <Card>
          <p className="text-body-md text-muted">
            Đang chờ hộ kinh doanh nhận ({transfer.toVendorPhone}) xác nhận chấp thuận.
          </p>
        </Card>
      ) : null}
    </Screen>
  );
}
