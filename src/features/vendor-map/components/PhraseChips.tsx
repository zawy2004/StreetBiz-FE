import { hasPhrase } from '@/features/buyer-discovery/append-phrase';

type Props = {
  phrases: readonly string[];
  /** The text the chips write into, to mark the ones already in it. */
  text: string;
  onPick: (phrase: string) => void;
  label: string;
  /** Wrap onto several lines (phones) instead of scrolling sideways. */
  wrap?: boolean;
  /** Ring the chips once on arrival, to invite the first words (no memory kept). */
  invite?: boolean;
};

/**
 * Quick-pick phrases that write themselves into a text field (one tap each,
 * never twice): the review's praise, the report's kind of violation, the
 * content report's reason. Pressed once the phrase is in the text.
 */
export function PhraseChips({ phrases, text, onPick, label, wrap = false, invite = false }: Props) {
  return (
    <div
      role="group"
      aria-label={label}
      className={
        wrap
          ? 'flex flex-wrap gap-xs'
          : 'no-scrollbar -mx-md flex gap-xs overflow-x-auto px-md py-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0'
      }
    >
      {phrases.map((phrase, index) => {
        const used = hasPhrase(text, phrase);
        return (
          <button
            key={phrase}
            type="button"
            aria-pressed={used}
            onClick={() => onPick(phrase)}
            style={invite ? { animationDelay: `${index * 70}ms` } : undefined}
            className={[
              'h-11 shrink-0 rounded-full px-md text-label transition-[background-color,box-shadow,color,transform] duration-[120ms] active:scale-[0.97]',
              used
                ? 'bg-primary font-semibold text-on-primary shadow-[0_8px_20px_-8px_rgb(var(--c-primary)/0.7)]'
                : 'bg-card text-text shadow-card ring-1 ring-border hover:ring-text/25 active:bg-tint-primary active:ring-brand',
              invite && !used ? 'sb-pop' : '',
            ].join(' ')}
          >
            {phrase}
          </button>
        );
      })}
    </div>
  );
}
