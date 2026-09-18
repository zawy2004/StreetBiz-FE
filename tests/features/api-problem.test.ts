import { ApiError, errorMessage, isTokenFailure, toApiError } from '@/core/api/problem';

describe('ProblemDetails mapping', () => {
  it('surfaces the backend detail message for an AppException', () => {
    const error = toApiError(409, {
      title: 'conflict',
      status: 409,
      detail: 'You already have a registration under review.',
    });

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('conflict');
    expect(error.message).toBe('You already have a registration under review.');
  });

  it('exposes field errors from a validation failure', () => {
    const error = toApiError(400, {
      type: 'validation_error',
      status: 400,
      errors: {
        PhoneNumber: ['Please enter a valid phone number.'],
        Password: ['Password must be at least 8 characters...'],
      },
    });

    expect(error.isValidation).toBe(true);
    expect(error.fieldError('PhoneNumber')).toBe('Số điện thoại phải gồm 10 số, bắt đầu bằng 0.');
  });

  it('looks field errors up case-insensitively, since the backend sends PascalCase', () => {
    const error = toApiError(400, {
      type: 'validation_error',
      errors: { PhoneNumber: ['bad phone'] },
    });

    expect(error.fieldError('phoneNumber')).toBe('bad phone');
    expect(error.fieldError('Otp')).toBeUndefined();
  });

  it('falls back to a field message when validation has no detail', () => {
    const error = toApiError(400, {
      type: 'validation_error',
      errors: { Otp: ['The verification code must be 6 digits.'] },
    });

    expect(error.message).toBe('Mã xác thực gồm 6 chữ số.');
  });

  it('derives a code from the status when the body has no type', () => {
    expect(toApiError(401, {}).code).toBe('unauthorized');
    expect(toApiError(403, {}).code).toBe('forbidden');
    expect(toApiError(404, {}).code).toBe('not_found');
    expect(toApiError(500, {}).code).toBe('server_error');
  });

  it('reports a transport failure as a network error', () => {
    const error = toApiError(undefined, undefined);
    expect(error.code).toBe('network_error');
    expect(error.message).toMatch(/không kết nối được/i);
  });

  it('extracts a message from any thrown value', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
    expect(errorMessage('not an error')).toMatch(/hệ thống/i);
  });
});

describe('backend message translation', () => {
  it('shows backend messages in Vietnamese', () => {
    const error = toApiError(401, { type: 'unauthorized', detail: 'Invalid phone number or password.' });
    expect(error.message).toBe('Số điện thoại hoặc mật khẩu không đúng.');
  });

  it('translates field-level validation messages too', () => {
    const error = toApiError(400, {
      type: 'validation_error',
      errors: { CurrentPassword: ['The current password you entered is incorrect.'] },
    });
    expect(error.fieldError('CurrentPassword')).toBe('Mật khẩu hiện tại không đúng.');
  });

  it('translates the templated not-editable message', () => {
    const error = toApiError(422, {
      type: 'domain_rule',
      detail: 'This registration can no longer be edited because it is APPROVED.',
    });
    expect(error.message).toBe('Hồ sơ không thể chỉnh sửa vì đã được duyệt.');
  });

  it('carries the OTP cooldown so the UI can count down', () => {
    const error = toApiError(429, {
      type: 'otp_cooldown',
      detail: 'Please wait before requesting another verification code.',
      retryAfterSeconds: 37,
    });
    expect(error.code).toBe('otp_cooldown');
    expect(error.retryAfterSeconds).toBe(37);
  });
});

describe('isTokenFailure', () => {
  it('treats an empty 401 from the JWT middleware as a token failure', () => {
    expect(isTokenFailure(401, '')).toBe(true);
    expect(isTokenFailure(401, undefined)).toBe(true);
  });

  it('does not refresh for a handler 401 with a ProblemDetails body', () => {
    expect(isTokenFailure(401, { type: 'unauthorized', detail: 'The verification code is incorrect.' })).toBe(false);
    expect(isTokenFailure(403, '')).toBe(false);
  });
});
