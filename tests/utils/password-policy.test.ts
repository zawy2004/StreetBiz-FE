import { isPasswordValid, passwordError, PASSWORD_RULES } from '@/core/auth/password-policy';

/**
 * The client rules must not be looser than the backend's
 * AuthValidationRules.PasswordRegex, or the user gets a server error for a
 * password the form told them was fine.
 */
const BACKEND_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s])\S{8,}$/;

describe('password policy', () => {
  it('accepts a password that satisfies BR-59', () => {
    expect(isPasswordValid('Str0ng!Pass')).toBe(true);
    expect(passwordError('Str0ng!Pass')).toBeUndefined();
  });

  it.each([
    ['too short', 'St0!aB'],
    ['no uppercase', 'str0ng!pass'],
    ['no lowercase', 'STR0NG!PASS'],
    ['no digit', 'Strong!Pass'],
    ['no special character', 'Str0ngPass'],
    ['contains whitespace', 'Str0ng! Pass'],
  ])('rejects a password with %s', (_label, value) => {
    expect(isPasswordValid(value)).toBe(false);
    expect(passwordError(value)).toBeDefined();
  });

  it('agrees with the backend regex on every case', () => {
    const samples = [
      'Str0ng!Pass',
      'St0!aB',
      'str0ng!pass',
      'STR0NG!PASS',
      'Strong!Pass',
      'Str0ngPass',
      'Str0ng! Pass',
      '',
      'Aa1!aaaa',
    ];
    for (const sample of samples) {
      expect(isPasswordValid(sample)).toBe(BACKEND_REGEX.test(sample));
    }
  });

  it('names the first unmet rule so the message is actionable', () => {
    expect(passwordError('a')).toContain(PASSWORD_RULES[0]!.label.toLowerCase());
  });
});
