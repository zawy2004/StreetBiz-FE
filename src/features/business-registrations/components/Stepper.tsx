import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/common';
import { env } from '@/core/config/env';

type Props = {
  step: number;
  total: number;
  label: string;
};

export function Stepper({ step, total, label }: Props) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-2xs">
      <div
        role="progressbar"
        aria-label="Tiến độ đăng ký"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={step}
        aria-valuetext={`Bước ${step} trên ${total}: ${label}`}
        className="flex gap-1"
      >
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${i < step ? 'bg-primary' : 'bg-border'}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-sm">
        <span className="text-body-sm text-muted">
          Bước {step}/{total} · {label}
        </span>
        {env.enableAiCompliance ? (
          <Button
            label="Hỏi trợ lý"
            variant="ghost"
            fullWidth={false}
            onPress={() =>
              navigate('/vendor/assistant', {
                state: { context: `Hộ kinh doanh đang đăng ký, bước ${step}/${total}: ${label}.` },
              })
            }
          />
        ) : null}
      </div>
    </div>
  );
}
