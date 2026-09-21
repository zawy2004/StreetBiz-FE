import brandMark from '@/assets/brand/streetbiz-mark-orange.png';

type Props = {
  size?: number;
};

/**
 * StreetBiz mark: a ring of sidewalk-slot squares around a market-stall dot.
 * Fixed brand colours (not theme tokens) - the mark is designed to sit on a
 * transparent background, so it reads the same on light headers, the indigo
 * sidebar and dark mode alike.
 */
export function BrandLogo({ size = 32 }: Props) {
  return (
    <img
      src={brandMark}
      alt="StreetBiz"
      width={size}
      height={size}
      className="shrink-0 select-none"
      draggable={false}
    />
  );
}
