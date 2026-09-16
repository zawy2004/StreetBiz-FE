import { Card } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { useMockDb } from '@/mocks/db';

export function PenaltyScheduleScreen() {
  const violationTypes = useMockDb((s) => s.violationTypes);
  const updateAmount = useMockDb((s) => s.updatePenaltyAmount);

  return (
    <Screen>
      <AppHeader title="Biểu phí phạt" back subtitle="Áp dụng cho toàn phường" />
      {violationTypes.map((vt) => (
        <Card key={vt.code}>
          <p className="mb-sm text-headline-sm text-text">{vt.label}</p>
          <div className="flex items-center gap-sm">
            <div className="flex-1">
              <TextField
                value={String(vt.default_amount)}
                onChangeText={(v) => updateAmount(vt.code, Number(v) || 0)}
                keyboardType="numeric"
              />
            </div>
            <span className="text-body-md text-muted">đ</span>
          </div>
        </Card>
      ))}
    </Screen>
  );
}
