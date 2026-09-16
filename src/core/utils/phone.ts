/** Normalizes a "+84 xxx" field entry (no leading 0) to a local 0-prefixed number. */
export function toLocalPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  return digits.startsWith('0') ? digits : `0${digits}`;
}
