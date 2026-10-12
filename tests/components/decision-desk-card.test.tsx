import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { TextField } from '@/components/forms';
import { DecisionDeskCard } from '@/features/ward-administration/components/review/PermitDossierParts';

afterEach(cleanup);

describe('DecisionDeskCard', () => {
  it('is its own form container, so a note field stacks in the narrow side card', () => {
    render(
      <DecisionDeskCard title="Quyết định gia hạn">
        <TextField label="Ghi chú phản hồi" value="" onChangeText={() => {}} multiline />
      </DecisionDeskCard>,
    );

    // `.cq` is the container the Field's label-beside-control layout measures (index.css). The
    // card must be one, or the field measures the wide screen and squeezes into a sliver.
    const card = screen.getByRole('region', { name: 'Quyết định gia hạn' });
    expect(card).toHaveClass('cq');
    expect(card.querySelector('.field')).not.toBeNull();
  });
});
