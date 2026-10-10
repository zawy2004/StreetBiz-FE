/**
 * Writes a quick-pick phrase into free text the way a person would: alone when
 * the text is empty, otherwise after a comma in lower case; never twice. The
 * caller still passes the result through its own setter (and its length cap).
 */
export function appendPhrase(text: string, phrase: string): string {
  if (text.toLowerCase().includes(phrase.toLowerCase())) return text;
  const head = text.trim().replace(/[,;.\s]+$/, '');
  return head ? `${head}, ${phrase.charAt(0).toLowerCase()}${phrase.slice(1)}` : phrase;
}

/** Whether a phrase is already in the text (for a chip's pressed state). */
export const hasPhrase = (text: string, phrase: string) =>
  text.toLowerCase().includes(phrase.toLowerCase());
