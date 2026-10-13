import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Icon, type IconName } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { ErrorState } from '@/components/feedback';
import type { ApiRegistration } from '@/core/api';
import { useRegistrations } from '@/features/business-registrations/useRegistrations';

type StepState = 'done' | 'current' | 'todo';

type StepModel = {
  title: string;
  description: string;
  icon: IconName;
  state: StepState;
  /** Shown only on the step the vendor should act on now. */
  cta?: { label: string; to: string };
};

const ACTIVE_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'MORE_INFORMATION_REQUIRED'];

/** Picks the registration that best represents where the vendor stands. */
function pickActive(registrations: ApiRegistration[]): ApiRegistration | undefined {
  const approved = registrations.find((r) => r.registrationStatus === 'APPROVED');
  if (approved) return approved;
  const live = registrations
    .filter((r) => r.registrationStatus !== 'WITHDRAWN')
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return live[0];
}

function buildSteps(registrations: ApiRegistration[]): StepModel[] {
  const active = pickActive(registrations);
  const status = active?.registrationStatus;
  const regPath = active ? `/vendor/registrations/${active.registrationId}` : null;

  const approved = status === 'APPROVED';
  const pending = status === 'SUBMITTED' || status === 'UNDER_REVIEW';
  const needInfo = status === 'MORE_INFORMATION_REQUIRED';
  const rejected = status === 'REJECTED';
  const hasFiled = Boolean(active) && ACTIVE_STATUSES.includes(status ?? '');

  const fileStep: StepModel = {
    title: 'Hoàn tất hồ sơ đăng ký hộ kinh doanh',
    icon: 'file-document-outline',
    description: needInfo
      ? 'Phường yêu cầu bổ sung — hãy cập nhật và nộp lại.'
      : rejected
        ? 'Hồ sơ bị từ chối. Bạn có thể nộp hồ sơ mới.'
        : active
          ? 'Hồ sơ đã nộp theo Mẫu số 01 (Thông tư 68/2025).'
          : 'Khai thông tin chủ hộ, ngành nghề và tải giấy tờ (eKYC CCCD).',
    state: hasFiled || approved ? 'done' : 'current',
    cta:
      !active || rejected
        ? { label: 'Bắt đầu hồ sơ', to: '/vendor/registrations/new/type' }
        : needInfo && regPath
          ? { label: 'Bổ sung hồ sơ', to: regPath }
          : undefined,
  };

  const reviewStep: StepModel = {
    title: 'Chờ phường xét duyệt',
    icon: 'clipboard-text-outline',
    description: approved
      ? 'Hồ sơ đã được duyệt.'
      : pending
        ? 'Phường đang xem xét hồ sơ của bạn.'
        : needInfo
          ? 'Đang chờ bạn bổ sung thông tin.'
          : 'Sau khi nộp, phường sẽ xét duyệt hồ sơ.',
    state: approved ? 'done' : pending || needInfo ? 'current' : 'todo',
    cta: regPath && (pending || needInfo) ? { label: 'Xem tiến độ', to: regPath } : undefined,
  };

  const slotStep: StepModel = {
    title: 'Thuê chỗ trên vỉa hè',
    icon: 'map-marker-radius-outline',
    description: 'Chọn vị trí được phường mở và gửi yêu cầu thuê.',
    state: approved ? 'current' : 'todo',
    cta: approved ? { label: 'Tìm chỗ', to: '/vendor/slots' } : undefined,
  };

  const storeStep: StepModel = {
    title: 'Mở gian hàng & đăng món',
    icon: 'storefront-outline',
    description: 'Tạo gian hàng, thêm món và bắt đầu bán.',
    state: 'todo',
    cta: approved ? { label: 'Mở gian hàng', to: '/vendor/store' } : undefined,
  };

  const attpStep: StepModel = {
    title: 'Giấy an toàn thực phẩm (nếu bán đồ ăn)',
    icon: 'clipboard-text-outline',
    description:
      'Món thuộc ngành ăn uống cần cam kết/giấy ATTP mới được bán. Nộp trong mục Cửa hàng.',
    state: 'todo',
    cta: approved ? { label: 'Khai giấy ATTP', to: '/vendor/store/food-safety' } : undefined,
  };

  return [
    {
      title: 'Tạo tài khoản',
      icon: 'account-circle-outline',
      description: 'Số điện thoại của bạn đã được xác thực.',
      state: 'done',
    },
    fileStep,
    reviewStep,
    slotStep,
    storeStep,
    attpStep,
  ];
}

function StepRow({ step, index, last }: { step: StepModel; index: number; last: boolean }) {
  const navigate = useNavigate();
  const done = step.state === 'done';
  const current = step.state === 'current';

  return (
    <li className="flex gap-sm">
      <div className="flex flex-col items-center">
        <span
          aria-hidden="true"
          className={[
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1',
            done
              ? 'bg-secondary-bg text-on-secondary ring-transparent'
              : current
                ? 'bg-primary text-on-primary ring-transparent'
                : 'bg-card text-muted ring-border',
          ].join(' ')}
        >
          {done ? (
            <Icon name="check-circle" size={20} color="currentColor" />
          ) : (
            <Icon name={step.icon} size={20} color="currentColor" />
          )}
        </span>
        {!last ? (
          <span className={`mt-1 w-0.5 flex-1 ${done ? 'bg-secondary-bg' : 'bg-border'}`} />
        ) : null}
      </div>

      <div className={`min-w-0 flex-1 ${last ? '' : 'pb-lg'}`}>
        <div className="flex flex-wrap items-center gap-xs">
          <h2
            className={`text-body-lg font-semibold ${current ? 'text-text' : done ? 'text-text' : 'text-muted'}`}
          >
            {step.title}
          </h2>
          {done ? (
            <span className="rounded-full bg-secondary-bg px-2 py-0.5 text-label font-semibold text-on-secondary">
              Xong
            </span>
          ) : current ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-label font-semibold text-primary">
              Bước {index}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-body-sm text-muted">{step.description}</p>
        {step.cta ? (
          <div className="mt-sm">
            <Button
              label={step.cta.label}
              variant={current ? 'primary' : 'outline'}
              size="sm"
              fullWidth={false}
              onPress={() => navigate(step.cta!.to)}
            />
          </div>
        ) : null}
      </div>
    </li>
  );
}

/** Post-registration guide for a new vendor: the path from account to selling. */
export function VendorOnboardingScreen() {
  const { registrations, isLoading, isError, error, refetch } = useRegistrations();

  const steps = useMemo(() => buildSteps(registrations), [registrations]);
  const doneCount = steps.filter((s) => s.state === 'done').length;

  return (
    <Screen>
      <AppHeader
        title="Các bước để bắt đầu bán hàng"
        subtitle="Làm lần lượt — chúng tôi dẫn bạn từ hồ sơ đến khi mở gian hàng"
      />

      {isError ? (
        <ErrorState message={error ? String(error) : 'Không tải được hồ sơ.'} onRetry={() => refetch()} />
      ) : (
        <div className="flex flex-col gap-lg">
          <p className="flex flex-wrap items-baseline gap-x-sm">
            <span className="font-sign text-[40px] font-bold leading-[44px] text-text font-tabular">
              {doneCount}/{steps.length}
            </span>
            <span className="text-body-lg text-muted">bước đã hoàn tất</span>
          </p>

          <ol className={`flex flex-col ${isLoading ? 'opacity-60' : ''}`}>
            {steps.map((step, i) => (
              <StepRow key={step.title} step={step} index={i} last={i === steps.length - 1} />
            ))}
          </ol>
        </div>
      )}
    </Screen>
  );
}
