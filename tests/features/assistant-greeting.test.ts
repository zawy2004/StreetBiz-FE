import { greeting } from '@/features/assistant/assistant-ux';

/** Vietnam is UTC+7: 17:00Z on the 14th is midnight on the 15th. */
const at = (utcHour: number) => new Date(Date.UTC(2026, 10, 14, utcHour, 30));

describe('assistant greeting', () => {
  it('does not say good morning or good evening in the small hours', () => {
    expect(greeting(at(17))).toBe('Khuya rồi'); // 00:30
    expect(greeting(at(20))).toBe('Khuya rồi'); // 03:30
  });

  it('follows the day from morning to evening', () => {
    expect(greeting(at(22))).toBe('Chào buổi sáng'); // 05:30
    expect(greeting(at(4))).toBe('Chào buổi trưa'); // 11:30
    expect(greeting(at(8))).toBe('Chào buổi chiều'); // 15:30
    expect(greeting(at(12))).toBe('Chào buổi tối'); // 19:30
  });
});
