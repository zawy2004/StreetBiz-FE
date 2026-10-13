/**
 * Shown in the content area while a lazily loaded screen's chunk downloads: the
 * outline of a screen (title, then three blocks), so the page does not flash
 * blank and nothing jumps when it lands. Navigation around it stays.
 */
export function ScreenFallback() {
  return (
    <div
      aria-busy="true"
      className="mx-auto flex h-full min-h-[40vh] w-full max-w-[1040px] flex-col gap-md p-md md:px-lg lg:px-xl lg:py-lg"
    >
      <span className="sr-only">Đang tải…</span>
      <span
        aria-hidden="true"
        className="sb-shimmer h-[30px] w-[240px] max-w-full rounded-[10px]"
      />
      <span aria-hidden="true" className="sb-shimmer h-4 w-[360px] max-w-full rounded-full" />
      <div aria-hidden="true" className="mt-sm grid gap-md md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <span key={i} className="sb-shimmer h-[132px] rounded-[20px]" />
        ))}
      </div>
    </div>
  );
}
