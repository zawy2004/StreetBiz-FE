import { useNavigate } from 'react-router-dom';

import { Button, Icon } from '@/components/common';
import { AppHeader, Screen, StickyActions } from '@/components/layout';
import { ErrorState } from '@/components/feedback';
import { errorMessage } from '@/core/api';
import {
  FolderSkeleton,
  RegisterThenRentStrip,
  RegistrationFolderCard,
  RegistrationsSummary,
} from '../components/list/ListParts';
import { EmptyFolderArt } from '../components/registration-art';
import { useNewRegistrationStore } from '../new-registration-store';
import { useRegistrations } from '../useRegistrations';

/**
 * REG-03: the vendor's own registrations as a cabinet of folders, each with its
 * journey line, and the reminder that a sidewalk slot is a separate application.
 */
export function RegistrationsListScreen() {
  const navigate = useNavigate();
  const reset = useNewRegistrationStore((s) => s.reset);
  const { registrations, isLoading, isError, error, refetch } = useRegistrations();

  const startNew = () => {
    reset();
    navigate('/vendor/registrations/new/type');
  };

  const newButton = (
    <Button
      label="Đăng ký kinh doanh mới"
      icon={<Icon name="plus" size={18} color="currentColor" />}
      onPress={startNew}
    />
  );

  const hasApproved = registrations.some((r) => r.registrationStatus === 'APPROVED');
  const strip = (vertical?: boolean) => (
    <RegisterThenRentStrip
      vertical={vertical}
      canRent={hasApproved}
      onRent={() => navigate('/vendor/slots')}
    />
  );

  const body = () => {
    if (isLoading) return <FolderSkeleton />;
    if (isError) {
      return (
        <div className="rounded-[24px] border-2 border-dashed border-error/40 bg-card">
          <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
        </div>
      );
    }
    if (registrations.length === 0) {
      return (
        <>
          <div className="flex flex-col items-center rounded-[28px] bg-card px-lg py-2xl text-center shadow-card ring-1 ring-border">
            <EmptyFolderArt />
            <p className="mt-md font-heading text-[22px] font-bold leading-tight text-text">
              Chưa có hồ sơ đăng ký
            </p>
            <p className="mt-1 max-w-[46ch] text-body-lg text-muted">
              Nộp hồ sơ để được phường xét duyệt và nhận giấy phép số.
            </p>
            <p className="mt-md inline-flex items-center gap-1.5 text-body-md font-semibold text-primary">
              <Icon name="information-outline" size={16} color="currentColor" />
              Bấm “Đăng ký kinh doanh mới” để bắt đầu.
            </p>
          </div>
          {strip()}
        </>
      );
    }

    const single = registrations.length === 1;
    return (
      <>
        <div className="grid items-stretch gap-lg xl:grid-cols-2">
          {registrations.map((r, i) => (
            <RegistrationFolderCard
              key={r.registrationId}
              registration={r}
              index={i}
              onOpen={() => navigate(`/vendor/registrations/${r.registrationId}`)}
            />
          ))}
          {/* One file: the BR-08 strip stands beside it on wide screens so the row is not half empty. */}
          {single ? <div className="hidden pt-8 xl:block">{strip(true)}</div> : null}
        </div>
        <div className={single ? 'xl:hidden' : ''}>{strip()}</div>
      </>
    );
  };

  return (
    <Screen
      footer={
        <div className="lg:hidden">
          <StickyActions>{newButton}</StickyActions>
        </div>
      }
    >
      <AppHeader
        title="Đăng ký kinh doanh"
        back
        right={<div className="hidden min-w-[240px] lg:block">{newButton}</div>}
      />
      {!isLoading && !isError && registrations.length >= 2 ? (
        <RegistrationsSummary registrations={registrations} />
      ) : null}
      {body()}
    </Screen>
  );
}
