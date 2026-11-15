/**
 * The eKYC answers (`KycIdCardExtraction`, `KycFaceMatchResult`) start their summary with the source
 * that really produced them: "[AI - FPT.AI]", "[AI - Gemini Vision]", "[AI - FPT.AI + Gemini Vision]"
 * or "[Hệ thống — chưa xác minh bằng AI]" when no provider could answer. The card titles used to hard-code
 * "FPT.AI", which was wrong whenever Gemini read the card or nothing did.
 */
export type KycSource = {
  /** What goes in the title's brackets. */
  label: string;
  /** The summary without its leading "[...]" tag, so the tag is not shown twice. */
  text: string;
};

const TAG = /^\s*\[([^\]]+)\]\s*/;

export function kycSource(summary: string, isAiGenerated: boolean): KycSource {
  const match = TAG.exec(summary);
  if (match) {
    return { label: match[1]!.trim(), text: summary.slice(match[0].length) };
  }
  return {
    label: isAiGenerated ? 'AI' : 'Hệ thống — chưa xác minh bằng AI',
    text: summary,
  };
}
