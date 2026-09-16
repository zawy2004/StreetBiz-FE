import { useNavigate, useParams } from 'react-router-dom';

import { Avatar, Button, Card, Icon, Money } from '@/components/common';
import { AppHeader, Screen, Section } from '@/components/layout';
import { AiHint, StatusChip } from '@/components/status';
import { EmptyState, ErrorState } from '@/components/feedback';
import { env } from '@/core/config/env';
import { colors } from '@/theme';
import { useMockDb } from '@/mocks/db';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/features/cart/cart-store';

export function VendorProfileScreen() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const vendor = useMockDb((s) => s.vendors.find((v) => v.id === vendorId));
  const contracts = useMockDb((s) => s.contracts).filter(
    (c) => c.vendorId === vendorId && c.contract_status === 'ACTIVE',
  );
  const permits = useMockDb((s) => s.permits);
  const slots = useMockDb((s) => s.slots);
  const comments = useMockDb((s) => s.comments).filter((c) => c.vendorId === vendorId);
  const storefront = useMockDb((s) => s.storefronts.find((st) => st.vendorId === vendorId));
  const menuItems = useMockDb((s) => s.menuItems).filter((m) => m.storefrontId === storefront?.id);
  const cartItems = useCartStore((s) => s.items).filter((i) => i.storefrontId === storefront?.id);

  if (!vendor) return <ErrorState message="Không tìm thấy hộ kinh doanh." />;

  const contract = contracts[0];
  const permit = permits.find((p) => p.contractId === contract?.id);
  const slot = slots.find((s) => s.id === contract?.slotId);
  const ratingAvg = comments.length
    ? comments.reduce((sum, c) => sum + c.rating, 0) / comments.length
    : 0;

  return (
    <Screen>
      <AppHeader title={vendor.business_name} back />
      <Card>
        <div className="flex gap-sm">
          <Avatar name={vendor.business_name} size={56} />
          <div className="flex flex-1 flex-col gap-1">
            {permit ? <StatusChip code={permit.permit_status} /> : null}
            {comments.length ? (
              <div className="flex items-center gap-1">
                <Icon name="star" size={16} color={colors.secondary} />
                <span className="text-body-md text-text">
                  {ratingAvg.toFixed(1)} ({comments.length} đánh giá)
                </span>
              </div>
            ) : null}
          </div>
        </div>
        {slot ? (
          <p className="mt-sm text-body-md text-muted">
            {slot.street} · Ô {slot.slot_code} · {slot.time_window}
          </p>
        ) : null}
      </Card>

      <div className="flex gap-sm">
        <div className="flex-1">
          <Button
            label="Viết đánh giá"
            variant="outline"
            onPress={() =>
              user
                ? navigate(`/customer/explore/vendors/${vendor.id}/comments/new`)
                : navigate('/auth/sign-in')
            }
          />
        </div>
        <div className="flex-1">
          <Button
            label="Báo cáo vi phạm"
            variant="ghost"
            onPress={() => navigate(`/customer/explore/vendors/${vendor.id}/reports/new`)}
          />
        </div>
      </div>

      {env.enableAiCompliance && comments.length > 2 ? (
        <AiHint title="Tóm tắt đánh giá">
          Khách hàng khen ngợi hương vị và vệ sinh an toàn thực phẩm, một số phản hồi về thời gian
          chờ vào giờ cao điểm.
        </AiHint>
      ) : null}

      {storefront && menuItems.length > 0 ? (
        <Section
          title="Thực đơn"
          action={
            cartItems.length > 0 ? (
              <Button
                label={`Giỏ hàng (${cartItems.length})`}
                fullWidth={false}
                variant="outline"
                onPress={() => navigate('/customer/explore/cart')}
              />
            ) : undefined
          }
        >
          {menuItems.map((item) => (
            <Card key={item.id} onPress={() => navigate(`/customer/explore/items/${item.id}`)}>
              <div className="flex items-center justify-between">
                <span className="text-headline-sm text-text">{item.name}</span>
                <Money amountVnd={item.price} />
              </div>
            </Card>
          ))}
        </Section>
      ) : null}

      <Section title={`Đánh giá (${comments.length})`}>
        {comments.length === 0 ? (
          <EmptyState icon="comment-outline" title="Chưa có đánh giá nào" />
        ) : (
          comments.map((c) => (
            <Card key={c.id}>
              <div className="flex items-center justify-between">
                <span className="text-headline-sm text-text">{c.authorName}</span>
                <div className="flex items-center gap-0.5">
                  <Icon name="star" size={14} color={colors.secondary} />
                  <span className="text-body-sm text-muted">{c.rating}</span>
                </div>
              </div>
              <p className="mt-1 text-body-md text-muted">{c.text}</p>
            </Card>
          ))
        )}
      </Section>
    </Screen>
  );
}
