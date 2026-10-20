import type { IconName } from '@/components/common';
import type { StatusTone } from '@/theme';

export type VerdictTone = { wash: string; ink: string; stroke: string; icon: IconName };

/**
 * Verdict tones for reading at arm's length in sunlight. The ground stays light
 * (a pale wash of the tone) and the words carry the colour: every pair is at
 * least 7:1 (#0B5D33 on #E6F6EC 7.2, #8F1717 on #FDEBEA 7.9, #6B4100 on #FFF3D1
 * 8.0, #2B3640 on #EEF1F4 10.9; the dark-mode pairs are higher). Colour is never
 * the only signal: each verdict has its own glyph and words.
 */
export const VERDICT_TONES: Record<StatusTone, VerdictTone> = {
  ok: {
    wash: 'bg-[#E6F6EC] dark:bg-[#10301F]',
    ink: 'text-[#0B5D33] dark:text-[#8BE3B0]',
    stroke: 'stroke-[#0B5D33] dark:stroke-[#8BE3B0]',
    icon: 'check-circle',
  },
  pending: {
    wash: 'bg-[#FFF3D1] dark:bg-[#3A2A08]',
    ink: 'text-[#6B4100] dark:text-[#FFD27A]',
    stroke: 'stroke-[#6B4100] dark:stroke-[#FFD27A]',
    icon: 'alert-circle-outline',
  },
  danger: {
    wash: 'bg-[#FDEBEA] dark:bg-[#3A1414]',
    ink: 'text-[#8F1717] dark:text-[#FF9A90]',
    stroke: 'stroke-[#8F1717] dark:stroke-[#FF9A90]',
    icon: 'close-circle-outline',
  },
  neutral: {
    wash: 'bg-[#EEF1F4] dark:bg-[#1D2833]',
    ink: 'text-[#2B3640] dark:text-[#C5D0DA]',
    stroke: 'stroke-[#2B3640] dark:stroke-[#C5D0DA]',
    icon: 'information-outline',
  },
};
