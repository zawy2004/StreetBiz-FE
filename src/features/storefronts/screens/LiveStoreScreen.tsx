import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/common';
import { EmptyState, ErrorState, showToast } from '@/components/feedback';
import { AppHeader, Screen } from '@/components/layout';
import { errorMessage } from '@/core/api';
import { sellerStoreApi, type SellerStore, type StoreInput } from '@/core/api/seller-store-api';
import { storefrontPhotos } from '@/features/buyer-discovery/food-photos';
import { orderApi } from '@/features/orders/api/orderApi';
import { orderKeys } from '@/features/orders/hooks/useOrders';
import type { OrderListFilters } from '@/features/orders/types/order.types';
import { useMediaQuery } from '@/hooks/useBreakpoint';
import { StoreEditorPanel } from '../components/store/StoreEditorPanel';
import {
  OpenAnotherStall,
  StartSellingSteps,
  StoreShortcuts,
  StoreSkeleton,
  StorefrontFacade,
} from '../components/store/StoreParts';
import { contractFor, eligibilityReason } from '../store-view';

/** The shell's new-order bell polls this exact key; reading it here sends nothing. */
const NEWEST_PLACED: OrderListFilters = { status: 'PLACED', page: 1, pageSize: 1 };

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
  const newOrders = useQuery({
    queryKey: orderKeys.vendorList(NEWEST_PLACED),
    queryFn: () => orderApi.vendorOrders(NEWEST_PLACED),
    enabled: false,
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
  const wide = useMediaQuery('(min-width: 1280px)');
  const editor = useRef<HTMLElement>(null);
  const nameField = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const editingKey = editing === 'new' ? 'new' : (editing?.storefrontId ?? null);

  // Opening the form brings it into view and puts the cursor where the vendor
  // starts; closing it hands focus back to the button that opened it.
  useEffect(() => {
    if (editingKey === null) {
      opener.current?.focus();
      opener.current = null;
      return;
    }
    editor.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
    if (editingKey === 'new')
      editor.current
        ?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')
        ?.focus({ preventScroll: true });
    else nameField.current?.focus({ preventScroll: true });
  }, [editingKey]);

  if (stores.isPending || contracts.isPending || applications.isPending) return <StoreSkeleton />;
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

  const remember = () => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  };
  const openCreate = () => {
    remember();
    setEditing('new');
    setName('');
    setDescription('');
    setStatus('OPEN');
    setContractId(String(choices[0]!.contractId));
    save.reset();
  };
  const editedStore = editing && editing !== 'new' ? editing : null;
  const editedContract = editedStore ? contractFor(editedStore, contracts.data) : undefined;
  const panel = editing ? (
    <StoreEditorPanel
      ref={editor}
      mode={editing === 'new' ? 'new' : 'edit'}
      choices={choices}
      contractId={contractId}
      onContractChange={setContractId}
      name={name}
      onNameChange={setName}
      description={description}
      onDescriptionChange={setDescription}
      status={status}
      onStatusChange={setStatus}
      slotCode={editedContract?.slotCode}
      contractEnd={editedContract?.endDate}
      photoKey={editedStore?.storefrontId ?? 0}
      saving={save.isPending}
      canSave={Boolean(name.trim()) && !(editing === 'new' && !selected)}
      error={save.isError ? errorMessage(save.error) : null}
      onSave={submit}
      onClose={() => setEditing(null)}
      nameRef={nameField}
    />
  ) : null;

  const shortcuts = (
    <StoreShortcuts
      newOrders={newOrders.data?.totalItems}
      onOrders={() => navigate('/vendor/store/orders')}
      onSales={() => navigate('/vendor/store/sales')}
    />
  );
  const openStall =
    !editing && choices.length > 0 ? (
      <OpenAnotherStall
        slotCode={choices[0]!.slotCode}
        contractEnd={choices[0]!.endDate}
        onCreate={openCreate}
        large={!stores.data.length}
      />
    ) : null;
  const reason = eligibilityReason(contracts.data, today);

  const facades: ReactNode = stores.data.map((store) => {
    const contract = contractFor(store, contracts.data);
    return (
      <div key={store.storefrontId} className="flex flex-col gap-md">
        <StorefrontFacade
          data={{
            name: store.name,
            description: store.description,
            status: store.availabilityStatus,
            photos: storefrontPhotos({
              storefrontId: store.storefrontId,
              storefrontName: store.name,
              description: store.description,
            }),
            slotCode: contract?.slotCode,
            contractEnd: contract?.endDate,
          }}
        >
          <div className="grid grid-cols-2 gap-sm sm:flex sm:flex-wrap">
            <div className="col-span-2 min-w-0 sm:w-auto">
              <Button
                label="Quản lý thực đơn"
                onPress={() => navigate(`/vendor/store/menu?storefrontId=${store.storefrontId}`)}
              />
            </div>
            <div className="min-w-0 sm:w-auto">
              <Button
                label="Giấy ATTP"
                variant="outline"
                onPress={() =>
                  navigate(`/vendor/store/food-safety?storefrontId=${store.storefrontId}`)
                }
              />
            </div>
            <div className="min-w-0 sm:w-auto">
              <Button
                label="Sửa gian hàng"
                variant="outline"
                onPress={() => {
                  remember();
                  setEditing(store);
                  setName(store.name);
                  setDescription(store.description ?? '');
                  setStatus(store.availabilityStatus);
                  save.reset();
                }}
              />
            </div>
          </div>
        </StorefrontFacade>
        {!wide && editedStore?.storefrontId === store.storefrontId ? panel : null}
      </div>
    );
  });

  return (
    <Screen width="wide">
      <div className="flex flex-col gap-md xl:flex-row xl:items-end xl:justify-between">
        <AppHeader title="Cửa hàng" subtitle="Gian hàng và thực đơn của bạn" />
        {shortcuts}
      </div>
      {!wide && editing === 'new' ? panel : null}
      <div className="grid gap-lg xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start xl:gap-xl">
        <div className="flex min-w-0 flex-col gap-lg">
          {facades}
          {!stores.data.length && openStall}
          {!stores.data.length && !choices.length ? (
            <EmptyState
              icon="storefront-outline"
              title="Chưa đủ điều kiện mở gian hàng"
              description="Cần hồ sơ đã duyệt và hợp đồng đang hiệu lực của bạn."
              action={
                <div className="flex flex-col items-center gap-sm">
                  {reason ? <p className="text-body-lg font-medium text-text">{reason}</p> : null}
                  <Button
                    label="Thuê ô vỉa hè"
                    fullWidth={false}
                    onPress={() => navigate('/vendor/slots')}
                  />
                </div>
              }
            />
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-lg xl:sticky xl:top-lg">
          {wide && panel}
          {stores.data.length > 0 ? openStall : null}
          {!(wide && editing) ? <StartSellingSteps /> : null}
        </div>
      </div>
    </Screen>
  );
}
