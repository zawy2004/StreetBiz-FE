export function OrderListSkeleton() {
  return (
    <div aria-label="Đang tải đơn hàng" className="flex animate-pulse flex-col gap-sm">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-32 rounded-md border border-border bg-card" />
      ))}
    </div>
  );
}
