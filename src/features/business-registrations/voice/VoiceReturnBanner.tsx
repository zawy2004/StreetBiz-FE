import { useNavigate } from 'react-router-dom';

import { Button, Icon } from '@/components/common';
import { useVoiceSessionStore } from './voice-session-store';

/**
 * Shown on the wizard steps that "Sửa" opens from the voice confirm card: the way back to the
 * card. Renders nothing for a plain step-by-step registration.
 */
export function VoiceReturnBanner() {
  const navigate = useNavigate();
  const active = useVoiceSessionStore((s) => s.active && s.handedOff);
  const setPhase = useVoiceSessionStore((s) => s.setPhase);
  if (!active) return null;

  return (
    <div className="flex flex-col gap-sm rounded-[16px] bg-secondary-bg p-md text-on-secondary sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-sm text-[15px] font-semibold leading-[22px]">
        <Icon name="microphone" size={20} color="currentColor" weight="fill" className="mt-0.5 shrink-0" />
        Bạn đang sửa hồ sơ soạn bằng giọng nói. Sửa xong thì quay lại thẻ xác nhận để nộp.
      </p>
      <div className="sm:w-[260px] sm:shrink-0">
        <Button
          label="Quay lại thẻ xác nhận"
          variant="civic"
          onPress={() => {
            setPhase('card');
            navigate('/vendor/registrations/new/voice');
          }}
        />
      </div>
    </div>
  );
}
