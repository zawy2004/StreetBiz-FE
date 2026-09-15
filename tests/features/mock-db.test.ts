import { useMockDb } from '@/mocks/db';

describe('mock db actions', () => {
  it('approving a rental application creates an active contract and a valid digital permit', () => {
    const { submitRentalApplication, approveRentalApplication } = useMockDb.getState();

    const application = submitRentalApplication({
      vendorId: 'VEN-001',
      slotIds: ['SLOT-023'],
      application_type: 'OPEN_SLOT',
    });

    approveRentalApplication(application.id);

    const state = useMockDb.getState();
    const updatedApplication = state.applications.find((a) => a.id === application.id);
    const contract = state.contracts.find((c) => c.applicationId === application.id);
    const permit = contract && state.permits.find((p) => p.contractId === contract.id);
    const slot = state.slots.find((s) => s.id === 'SLOT-023');

    expect(updatedApplication?.application_status).toBe('APPROVED');
    expect(contract?.contract_status).toBe('ACTIVE');
    expect(permit?.permit_status).toBe('VALID');
    expect(slot?.slot_status).toBe('RENTED');
  });

  it('paying a fee item marks it paid and issues an invoice', () => {
    const { payFee } = useMockDb.getState();
    const before = useMockDb.getState().feeItems.find((f) => f.id === 'FEE-001');
    expect(before?.item_status).toBe('PENDING');

    payFee('FEE-001');

    const state = useMockDb.getState();
    const fee = state.feeItems.find((f) => f.id === 'FEE-001');
    const invoice = state.invoices.find((i) => i.feeItemId === 'FEE-001');

    expect(fee?.item_status).toBe('PAID');
    expect(invoice?.amount).toBe(fee?.amount);
  });

  it('rejecting a rental application releases its slots back to available', () => {
    const { submitRentalApplication, rejectRentalApplication } = useMockDb.getState();

    const application = submitRentalApplication({
      vendorId: 'VEN-001',
      slotIds: ['SLOT-025'],
      application_type: 'OPEN_SLOT',
    });
    expect(useMockDb.getState().slots.find((s) => s.id === 'SLOT-025')?.slot_status).toBe(
      'PENDING',
    );

    rejectRentalApplication(application.id, 'Không phù hợp');

    const state = useMockDb.getState();
    expect(state.applications.find((a) => a.id === application.id)?.application_status).toBe(
      'REJECTED',
    );
    expect(state.slots.find((s) => s.id === 'SLOT-025')?.slot_status).toBe('AVAILABLE');
  });
});
