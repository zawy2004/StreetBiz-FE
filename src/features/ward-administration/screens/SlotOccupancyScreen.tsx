import { useNavigate } from 'react-router-dom';

import { Button, Card } from '@/components/common';
import { AppHeader, Screen } from '@/components/layout';
import { StatusChip } from '@/components/status';
import { statusTones } from '@/theme';
import { useMockDb } from '@/mocks/db';

export function SlotOccupancyScreen() {
  const navigate = useNavigate();
  const slots = useMockDb((s) => s.slots).filter((s) => s.proposal_review_status !== 'PENDING');

  return (
    <Screen>
      <AppHeader
        title="Lưới ô vỉa hè"
        right={
          <Button
            label="Cấu hình"
            variant="outline"
            fullWidth={false}
            onPress={() => navigate('/ward/slots/editor')}
          />
        }
      />
      {slots.map((slot) => {
        const tone =
          statusTones[
            slot.slot_status === 'AVAILABLE'
              ? 'ok'
              : slot.slot_status === 'RENTED'
                ? 'neutral'
                : 'pending'
          ];
        return (
          <Card key={slot.id} style={{ padding: 0, overflow: 'hidden' }}>
            <div className="flex flex-row">
              <div className="w-1.5" style={{ backgroundColor: tone.fg }} />
              <div className="flex flex-1 flex-row items-center justify-between p-md">
                <div>
                  <p className="text-headline-sm text-text">{slot.slot_code}</p>
                  <p className="text-body-sm text-muted">{slot.street}</p>
                </div>
                <StatusChip code={slot.slot_status} />
              </div>
            </div>
          </Card>
        );
      })}
    </Screen>
  );
}
