export default function Loading() {
  return (
    <div className="space-y-4 py-6">
      <div className="h-6 w-48 animate-pulse rounded bg-line" />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-line bg-white">
            <div className="aspect-square animate-pulse bg-line" />
            <div className="space-y-2 p-2.5">
              <div className="h-3 w-full animate-pulse rounded bg-line" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-line" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
