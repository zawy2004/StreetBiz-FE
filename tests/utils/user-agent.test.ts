import { describeDevice } from '@/core/utils/user-agent';

describe('describeDevice', () => {
  it('names a desktop Chrome session', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    expect(describeDevice(ua)).toBe('Chrome trên Windows');
  });

  it('names an iPhone Safari session', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    expect(describeDevice(ua)).toBe('Safari trên iPhone');
  });

  it('does not mistake Edge or Opera for Chrome, even though their UA also contains "Chrome/"', () => {
    const edge =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
    const opera =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0';
    expect(describeDevice(edge)).toBe('Edge trên Windows');
    expect(describeDevice(opera)).toBe('Opera trên Windows');
  });

  it('names an Android Chrome session', () => {
    const ua =
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
    expect(describeDevice(ua)).toBe('Chrome trên Android');
  });

  it('falls back to a readable label for an empty or missing value', () => {
    expect(describeDevice(null)).toBe('Thiết bị không xác định');
    expect(describeDevice(undefined)).toBe('Thiết bị không xác định');
    expect(describeDevice('')).toBe('Thiết bị không xác định');
    expect(describeDevice('   ')).toBe('Thiết bị không xác định');
  });

  it('falls back for a string that carries neither a known browser nor platform', () => {
    expect(describeDevice('curl/8.2.1')).toBe('Thiết bị không xác định');
  });
});
