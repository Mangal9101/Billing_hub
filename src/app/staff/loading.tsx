export default function StaffLoading() {
  return (
    <div className="px-6 lg:px-8 xl:px-10 py-6 max-w-screen-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Staff Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Loading staff...</p>
        </div>
        <div className="h-9 w-28 rounded-lg bg-secondary animate-pulse" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-4">
            <div className="h-3 w-20 rounded bg-secondary animate-pulse" />
            <div className="h-7 w-10 rounded bg-secondary animate-pulse mt-2" />
          </div>
        ))}
      </div>
      <div className="relative max-w-sm">
        <div className="h-10 w-full rounded-lg bg-secondary animate-pulse" />
      </div>
      <div className="card overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 border-b border-border bg-secondary/20 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
