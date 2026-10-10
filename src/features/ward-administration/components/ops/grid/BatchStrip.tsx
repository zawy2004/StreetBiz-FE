import type { BatchCandidate } from '../../../ward-config-api';
import { hasBlock } from './placement';

const BLOCK_STRIPES = 'repeating-linear-gradient(135deg, #FDEBEA 0 6px, #F7C8C4 6px 12px)';

/**
 * The proposed run as a strip of slot plates, in kerb order, so the whole row
 * can be checked by eye before "Tạo {n} ô": blocked plates are striped red,
 * plates with a warning get a mango rim, plates left out are drawn dashed.
 * A picture of the checklist below it, so it is hidden from assistive tech.
 */
export function BatchStrip({
  candidates,
  excluded,
}: {
  candidates: BatchCandidate[];
  excluded: ReadonlySet<number>;
}) {
  if (candidates.length === 0) return null;
  return (
    <div aria-hidden="true" className="flex flex-col gap-xs">
      <div className="relative overflow-hidden rounded-[14px] bg-[#FFF3E8] p-xs ring-1 ring-brand/20 dark:bg-[#2A2420]">
        <ol className="no-scrollbar flex gap-1.5 overflow-x-auto pb-2">
          {candidates.map((c, i) => {
            const blocked = hasBlock(c.issues);
            const warned = !blocked && c.issues.length > 0;
            const out = excluded.has(c.index);
            return (
              <li
                key={c.index}
                style={{
                  animationDelay: `${Math.min(i, 20) * 25}ms`,
                  background: blocked ? BLOCK_STRIPES : undefined,
                }}
                className={[
                  'sb-pop flex h-11 shrink-0 items-center rounded-[6px] px-2 font-sign text-[14px] font-extrabold tracking-[0.02em] [font-stretch:72%] font-tabular',
                  blocked
                    ? 'text-[#8F1717] line-through ring-2 ring-[#B42318]'
                    : out
                      ? 'border-2 border-dashed border-[#566173] bg-white/60 text-[#566173]'
                      : warned
                        ? 'bg-[#FFF3D1] text-[#6B4100] ring-2 ring-[#C98A04]'
                        : 'bg-white text-[#111C2B] ring-2 ring-[#111C2B]',
                ].join(' ')}
              >
                {c.proposedCode}
              </li>
            );
          })}
        </ol>
        <div className="sb-kerb sb-kerb-thin absolute inset-x-0 bottom-0" />
      </div>
      <p className="flex flex-wrap gap-x-md gap-y-1 text-body-xs text-muted">
        <span className="flex items-center gap-1">
          <span
            className="h-3 w-4 rounded-[3px] ring-1 ring-[#B42318]"
            style={{ background: BLOCK_STRIPES }}
          />
          Bị chặn, tự bỏ ra
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-4 rounded-[3px] bg-[#FFF3D1] ring-1 ring-[#C98A04]" />
          Có cảnh báo
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-4 rounded-[3px] bg-white ring-1 ring-[#111C2B]" />
          Hợp lệ
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-4 rounded-[3px] border border-dashed border-[#566173]" />
          Đã bỏ chọn
        </span>
      </p>
    </div>
  );
}
