type Props = {
  uri?: string;
  name: string;
  size?: number;
};

export function Avatar({ uri, name, size = 40 }: Props) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  if (uri) {
    return (
      <img
        src={uri}
        alt={name}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        className="object-cover"
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className="flex items-center justify-center bg-indigo text-headline-sm text-on-indigo"
    >
      {initial}
    </div>
  );
}
