type ProfileSkeletonProps = {
  fields?: number;
  showTabs?: boolean;
  showCover?: boolean;
};

export function ProfileSkeleton({
  fields = 4,
  showTabs = true,
  showCover = true,
}: ProfileSkeletonProps) {
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <section className="flex flex-col">
        {showCover ? (
          <div className="h-24 animate-pulse rounded-2xl bg-[var(--color-input-bg)] sm:h-32" />
        ) : null}

        <div className="flex items-end gap-4 px-10 pb-1 sm:px-14">
          <div className="-mt-8 h-16 w-16 shrink-0 animate-pulse rounded-full bg-[var(--color-input-bg)] ring-4 ring-[var(--color-background)] sm:-mt-10 sm:h-20 sm:w-20" />
          <div className="min-w-0 flex-1 space-y-2 pb-1">
            <div className="h-4 w-40 animate-pulse rounded bg-[var(--color-input-bg)]" />
            <div className="h-3 w-28 animate-pulse rounded bg-[var(--color-input-bg)]" />
          </div>
        </div>

        {showTabs ? (
          <div className="mt-4 flex gap-6 px-10 sm:px-14">
            <div className="h-4 w-24 animate-pulse rounded bg-[var(--color-input-bg)]" />
            <div className="h-4 w-28 animate-pulse rounded bg-[var(--color-input-bg)]" />
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 p-4 sm:grid-cols-2">
        {Array.from({ length: fields }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-[var(--color-input-bg)]" />
            <div className="h-11 animate-pulse rounded-[16px] bg-[var(--color-input-bg)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
