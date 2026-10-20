type Props = {
  uri?: string;
  name: string;
  size?: number;
  /** Rounded squares for shop photos, circles for people. */
  shape?: 'circle' | 'rounded';
};

export function Avatar({ uri, name, size = 40, shape = 'circle' }: Props) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const borderRadius = shape === 'circle' ? size / 2 : Math.round(size * 0.22);

  if (uri) {
    return (
      <img
        src={uri}
        alt={name}
        style={{ width: size, height: size, borderRadius }}
        className="shrink-0 object-cover"
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      style={{ width: size, height: size, borderRadius, fontSize: Math.max(12, Math.round(size * 0.4)) }}
      className="flex shrink-0 items-center justify-center bg-tint-primary font-bold text-primary"
    >
      {initial}
    </div>
  );
}
