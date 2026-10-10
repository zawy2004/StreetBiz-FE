import { useState, type CSSProperties } from 'react';

import { Icon } from '@/components/common';
import { foodPhoto } from './paint-in';

type Props = {
  /** File key in public/images/food (e.g. `banh-mi`). */
  dish: string;
  /** Empty for decoration; the dish name when the photo carries meaning. */
  alt?: string;
  className?: string;
  style?: CSSProperties;
  glyphSize?: number;
  loading?: 'eager' | 'lazy';
  width?: number;
  height?: number;
};

/**
 * A stock dish photo that never shows a broken-image icon: if the file fails,
 * the dish glyph stands in on a soft orange tint, at the same size.
 */
export function FoodPhoto({
  dish,
  alt = '',
  className = '',
  style,
  glyphSize = 20,
  loading = 'lazy',
  width,
  height,
}: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        style={style}
        className={`flex items-center justify-center bg-tint-primary text-primary ${className}`}
      >
        <Icon name="silverware-fork-knife" size={glyphSize} color="currentColor" />
      </span>
    );
  }

  return (
    <img
      src={foodPhoto(dish)}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      loading={loading}
      decoding="async"
      width={width}
      height={height}
      draggable={false}
      onError={() => setFailed(true)}
      style={style}
      className={`object-cover ${className}`}
    />
  );
}
