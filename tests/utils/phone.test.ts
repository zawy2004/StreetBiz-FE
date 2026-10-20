import { formatPhone, isValidPhone, phoneError, toLocalPhone } from '@/core/utils/phone';

describe('phone normalization', () => {
  it('prefixes a 0 for the 9 digits typed after the +84 field prefix', () => {
    expect(toLocalPhone('905000001')).toBe('0905000001');
  });

  it('keeps an already-local number unchanged', () => {
    expect(toLocalPhone('0905000001')).toBe('0905000001');
  });

  it('converts a pasted +84 number to the local form the backend expects', () => {
    expect(toLocalPhone('+84905000001')).toBe('0905000001');
    expect(toLocalPhone('84905000001')).toBe('0905000001');
  });

  it('strips separators', () => {
    expect(toLocalPhone('0905 000 001')).toBe('0905000001');
  });
});

describe('phone validation', () => {
  it('accepts what AuthValidationRules.PhoneRegex accepts', () => {
    expect(isValidPhone('0905000001')).toBe(true);
    expect(isValidPhone('905000001')).toBe(true);
    expect(isValidPhone('+84905000001')).toBe(true);
  });

  it('rejects numbers that are the wrong length', () => {
    expect(isValidPhone('123')).toBe(false);
    expect(isValidPhone('09050000012')).toBe(false);
  });

  it('reports an empty field separately from a malformed one', () => {
    expect(phoneError('')).toMatch(/nhập số điện thoại/i);
    expect(phoneError('123')).toMatch(/10 số/);
    expect(phoneError('0905000001')).toBeUndefined();
  });
});

describe('phone formatting', () => {
  it('groups a valid number for display', () => {
    expect(formatPhone('0905000001')).toBe('0905 000 001');
  });

  it('returns the input untouched when it is not a valid number', () => {
    expect(formatPhone('abc')).toBe('abc');
  });
});
