import { parseOptionalCoordinate } from '@/features/business-registrations/new-registration-store';

describe('parseOptionalCoordinate', () => {
  it('treats an empty field as "no coordinate"', () => {
    expect(parseOptionalCoordinate('')).toBeNull();
    expect(parseOptionalCoordinate('   ')).toBeNull();
  });

  it('parses a valid decimal, including while it is still being typed', () => {
    expect(parseOptionalCoordinate('16')).toBe(16);
    expect(parseOptionalCoordinate('16.')).toBe(16);
    expect(parseOptionalCoordinate('16.0678')).toBe(16.0678);
  });

  it('rejects unparseable text instead of silently turning it into null', () => {
    // Number('16.06.78') and Number('abc') are both NaN; without this guard the
    // draft would submit as "no coordinate" (JSON.stringify turns NaN into null)
    // with no error shown to the user.
    expect(parseOptionalCoordinate('16.06.78')).toBeUndefined();
    expect(parseOptionalCoordinate('abc')).toBeUndefined();
    expect(parseOptionalCoordinate('16,0678')).toBeUndefined();
  });
});
