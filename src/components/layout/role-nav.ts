import type { RoleTabChild, RoleTabItem } from './RoleTabBar';

export const under = (path: string, prefix: string) =>
  path === prefix || path.startsWith(`${prefix}/`);

const prefixesOf = (entry: { to: string; match?: string[] }) => [entry.to, ...(entry.match ?? [])];

/** Whether the current path is one of this entry's pages (its own, its group's or its extras). */
export function isInside(path: string, item: RoleTabItem): boolean {
  return (
    prefixesOf(item).some((m) => under(path, m)) ||
    (item.children ?? []).some((c) => prefixesOf(c).some((m) => under(path, m)))
  );
}

/**
 * Which child of a group the current path belongs to: the one with the longest matching prefix
 * (so /finance/receipts lights "Biên lai", not the /finance overview); a path under the group
 * that no child claims falls to the first child without its own `match` (the overview).
 */
export function activeChild(path: string, children: RoleTabChild[]): string | undefined {
  let best: { to: string; length: number } | undefined;
  for (const child of children) {
    for (const prefix of prefixesOf(child)) {
      if (under(path, prefix) && (!best || prefix.length > best.length)) {
        best = { to: child.to, length: prefix.length };
      }
    }
  }
  return best?.to ?? children.find((c) => !c.match)?.to;
}
