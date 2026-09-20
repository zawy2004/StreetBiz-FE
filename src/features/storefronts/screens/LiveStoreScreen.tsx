import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '@/components/common';
import { EmptyState, ErrorState, LoadingState, showToast } from '@/components/feedback';
import { SelectField, TextField } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { errorMessage } from '@/core/api';
import { sellerStoreApi, type SellerStore, type StoreInput } from '@/core/api/seller-store-api';

export function LiveStoreScreen() {
  const navigate = useNavigate();
  const cache = useQueryClient();
  const stores = useQuery({ queryKey: ['commerce', 'stores'], queryFn: sellerStoreApi.stores });
  const contracts = useQuery({
    queryKey: ['commerce', 'store-contracts'],
    queryFn: sellerStoreApi.contracts,
  });
  const applications = useQuery({
    queryKey: ['commerce', 'store-applications'],
    queryFn: sellerStoreApi.applications,
  });
  const [editing, setEditing] = useState<SellerStore | 'new' | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contractId, setContractId] = useState('');
  const [status, setStatus] = useState('OPEN');
  const save = useMutation({
    mutationFn: ({ id, input }: { id: number | null; input: StoreInput }) =>
      sellerStoreApi.saveStore(id, input),
    onSuccess: async () => {
      setEditing(null);
      await cache.invalidateQueries({ queryKey: ['commerce'] });
      showToast('Đã lưu gian hàng');
    },
  });
  if (stores.isPending || contracts.isPending || applications.isPending) return <LoadingState />;
  if (stores.isError || contracts.isError || applications.isError)
    return (
      <ErrorState
        message={errorMessage(stores.error ?? contracts.error ?? applications.error)}
        onRetry={() => {
          void stores.refetch();
          void contracts.refetch();
          void applications.refetch();
        }}
      />
    );
  const today = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const choices = contracts.data
    .filter(
      (c) =>
        c.contractStatus === 'ACTIVE' &&
        c.startDate <= today &&
        c.endDate >= today &&
        !stores.data.some((s) => s.contractId === c.contractId),
    )
    .flatMap((c) => {
      const a = applications.data.find((a) => a.applicationId === c.applicationId);
      return a && !stores.data.some((s) => s.registrationId === a.registrationId)
        ? [{ ...c, registrationId: a.registrationId }]
        : [];
    });
  const selected = choices.find((c) => String(c.contractId) === contractId);
  const submit = () => {
    const existing = editing && editing !== 'new' ? editing : null;
    if (!existing && !selected) return;
    save.mutate({
      id: existing?.storefrontId ?? null,
      input: {
        registrationId: existing?.registrationId ?? selected!.registrationId,
        contractId: existing?.contractId ?? selected!.contractId,
        name: name.trim(),
        description: description.trim() || null,
        availabilityStatus: status,
      },
    });
  };
  return (
    <Screen>
      <AppHeader title="Cửa hàng" subtitle="Gian hàng và thực đơn của bạn" />
      {stores.data.map((store) => (
        <Card key={store.storefrontId}>
          <div className="flex items-center justify-between gap-sm">
            <h2 className="text-headline-sm">{store.name}</h2>
            <StatusChip code={store.availabilityStatus} />
          </div>
          <p className="my-sm text-body-md text-muted">{store.description || 'Chưa có mô tả'}</p>
          <div className="flex flex-wrap gap-sm">
            <Button
              label="Quản lý thực đơn"
              onPress={() => navigate(`/vendor/store/menu?storefrontId=${store.storefrontId}`)}
            />
            <Button
              label="Sửa gian hàng"
              variant="outline"
              onPress={() => {
                setEditing(store);
                setName(store.name);
                setDescription(store.description ?? '');
                setStatus(store.availabilityStatus);
                save.reset();
              }}
            />
          </div>
        </Card>
      ))}
      {!stores.data.length && !choices.length ? (
        <EmptyState
          icon="storefront-outline"
          title="Chưa đủ điều kiện mở gian hàng"
          description="Cần hồ sơ đã duyệt và hợp đồng đang hiệu lực của bạn."
        />
      ) : null}
      {!editing && choices.length > 0 ? (
        <Button
          label="Tạo gian hàng"
          variant="outline"
          onPress={() => {
            setEditing('new');
            setName('');
            setDescription('');
            setStatus('OPEN');
            setContractId(String(choices[0]!.contractId));
            save.reset();
          }}
        />
      ) : null}
      {editing ? (
        <Card>
          <h2 className="mb-sm text-headline-sm">
            {editing === 'new' ? 'Tạo gian hàng' : 'Sửa gian hàng'}
          </h2>
          {editing === 'new' ? (
            <SelectField
              label="Ô kinh doanh"
              value={contractId}
              onChange={setContractId}
              options={choices.map((c) => ({
                value: String(c.contractId),
                label: c.slotCode,
                description: `Hợp đồng đến ${c.endDate}`,
              }))}
            />
          ) : null}
          <TextField label="Tên gian hàng" value={name} onChangeText={setName} maxLength={180} />
          <TextField
            label="Mô tả"
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={1000}
          />
          <SelectField
            label="Trạng thái"
            value={status}
            onChange={setStatus}
            layout="inline"
            options={[
              { value: 'OPEN', label: 'Đang mở' },
              { value: 'PAUSED', label: 'Tạm dừng' },
              { value: 'CLOSED', label: 'Đóng cửa' },
            ]}
          />
          <div className="mt-sm flex gap-sm">
            <Button
              label="Lưu gian hàng"
              loading={save.isPending}
              disabled={!name.trim() || (editing === 'new' && !selected)}
              onPress={submit}
            />
            <Button
              label="Đóng"
              variant="ghost"
              disabled={save.isPending}
              onPress={() => setEditing(null)}
            />
          </div>
          {save.isError ? (
            <p role="alert" className="mt-sm text-error">
              {errorMessage(save.error)}
            </p>
          ) : null}
        </Card>
      ) : null}
      <Button label="Đơn hàng" variant="outline" onPress={() => navigate('/vendor/store/orders')} />
      <Button label="Doanh thu" variant="ghost" onPress={() => navigate('/vendor/store/sales')} />
    </Screen>
  );
}
