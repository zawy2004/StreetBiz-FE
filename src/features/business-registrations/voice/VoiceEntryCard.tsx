import { useNavigate } from 'react-router-dom';

import { Icon } from '@/components/common';

/**
 * "Nói để đăng ký" -- the way into the X01 voice flow from the wizard's first step and the vendor
 * home. The step-by-step wizard stays where it is; this is only the faster door.
 */
export function VoiceEntryCard({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate('/vendor/registrations/new/voice')}
      className={`group flex w-full items-center gap-md rounded-[24px] bg-primary text-left text-on-primary shadow-[0_16px_32px_-18px_rgb(var(--c-primary)/0.95)] transition hover:brightness-105 active:scale-[0.99] ${
        compact ? 'p-sm' : 'p-md md:p-lg'
      }`}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-full bg-on-primary/15 ring-2 ring-on-primary/30 ${
          compact ? 'h-12 w-12' : 'h-16 w-16'
        }`}
      >
        <Icon name="microphone" size={compact ? 26 : 34} color="currentColor" weight="fill" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block font-sign font-extrabold leading-tight tracking-[-0.01em] ${
            compact ? 'text-[19px]' : 'text-[22px] md:text-[26px]'
          }`}
        >
          Nói để đăng ký
        </span>
        <span className="mt-0.5 block text-[15px] font-medium text-on-primary/85">
          Nhanh, không cần gõ — chụp CCCD rồi kể vài câu, trợ lý AI điền giúp.
        </span>
      </span>
      <Icon
        name="chevron-right"
        size={24}
        color="currentColor"
        className="shrink-0 transition group-hover:translate-x-0.5"
      />
    </button>
  );
}
