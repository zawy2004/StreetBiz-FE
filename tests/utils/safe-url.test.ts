import { describe, expect, it } from 'vitest';

import {
  isApiRequestUrl,
  safeWebUrl,
  UnsafeFileUrlError,
  uploadsApiPath,
} from '@/core/security/safe-url';

describe('safeWebUrl', () => {
  it.each([
    ['https://pay.payos.vn/web/abc', 'https://pay.payos.vn/web/abc'],
    ['http://localhost:5033/x', 'http://localhost:5033/x'],
    ['/customer/orders/12', '/customer/orders/12'],
  ])('keeps a web link %s', (input, expected) => {
    expect(safeWebUrl(input)).toBe(expected);
  });

  it.each([
    'javascript:alert(1)',
    ' JavaScript:alert(1)',
    'java\tscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'streetbiz://payment/sandbox/x',
    '//evil.example/steal',
    '/\\evil.example',
    'not a url',
    '',
    null,
    undefined,
  ])('refuses %s', (input) => {
    expect(safeWebUrl(input as string | null | undefined)).toBeNull();
  });
});

describe('isApiRequestUrl', () => {
  const api = 'https://api.streetbiz.example/api';

  it('treats relative paths as API requests', () => {
    expect(isApiRequestUrl('/uploads/evidence/5/a.jpg', api)).toBe(true);
    expect(isApiRequestUrl('vendor/orders', api)).toBe(true);
  });

  it('accepts an absolute URL on the API origin', () => {
    expect(isApiRequestUrl('https://api.streetbiz.example/api/orders', api)).toBe(true);
  });

  it.each([
    'https://evil.example/steal',
    '//evil.example/steal',
    'http://api.streetbiz.example/api/x',
  ])('never sends the token to %s', (url) => {
    expect(isApiRequestUrl(url, api)).toBe(false);
  });
});

describe('uploadsApiPath', () => {
  it('turns a stored upload URL into an API path', () => {
    expect(uploadsApiPath('/api/uploads/evidence/5/abc.jpg')).toBe('/uploads/evidence/5/abc.jpg');
  });

  it.each([
    'https://evil.example/x.jpg',
    '//evil.example/x.jpg',
    '/api/vendor/finance/fees',
    '/api/uploads/../auth/sessions',
    '/api/uploads\\..\\auth',
    'javascript:alert(1)',
  ])('refuses %s', (input) => {
    expect(() => uploadsApiPath(input)).toThrow(UnsafeFileUrlError);
  });
});
