import { cn } from "@/lib/utils";

/**
 * Editorial skeleton placeholders. Tuned to the charcoal / off-white palette:
 * subtle muted fill, hairline border, gentle pulse — no harsh shimmer bars.
 */

function Shimmer({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse bg-gradient-to-br from-muted/60 to-muted/20",
        className,
      )}
      {...props}
    />
  );
}

/** Dashboard board card placeholder — matches the 4/5 aspect ProjectCard. */
export function BoardCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      role="presentation"
      className="relative flex aspect-[4/5] flex-col justify-between overflow-hidden bg-background p-6"
    >
      <Shimmer className="absolute inset-x-6 top-6 h-1/2 border border-border/60" />
      <div className="relative flex items-start justify-between">
        <Shimmer className="h-2 w-14" />
        <Shimmer className="h-4 w-4 rounded-full" />
      </div>
      <div className="relative space-y-3">
        <div className="flex gap-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Shimmer key={i} className="h-3 w-3 border border-border" />
          ))}
        </div>
        <Shimmer className="h-7 w-3/4" />
        <Shimmer className="h-3 w-1/2" />
        <div className="flex items-center justify-between pt-1">
          <Shimmer className="h-2 w-16" />
          <Shimmer className="h-2 w-20" />
        </div>
      </div>
    </div>
  );
}

/** Inspiration grid placeholder — matches the 4/5 aspect ImageCard. */
export function ImageCardSkeleton({ label }: { label?: string } = {}) {
  return (
    <figure aria-hidden="true" className="relative">
      <div className="relative aspect-[4/5] overflow-hidden border border-border bg-secondary">
        <Shimmer className="absolute inset-0" />
        {label && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <span className="font-mono-ui text-[10px] uppercase tracking-[0.25em]">
              {label}
            </span>
          </div>
        )}
      </div>
      <figcaption className="mt-3 flex items-baseline justify-between gap-4">
        <Shimmer className="h-2 w-24" />
        <Shimmer className="h-2 w-10" />
      </figcaption>
    </figure>
  );
}

/** Single palette swatch placeholder, square. */
export function SwatchSkeleton() {
  return <Shimmer className="aspect-square bg-secondary" />;
}

/** Compact share-view image placeholder (uses LazyImage aspect). */
export function ShareImageSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-3">
      <Shimmer className="aspect-[4/5] w-full border border-border/60" />
      <div className="flex items-center justify-between">
        <Shimmer className="h-2 w-20" />
        <Shimmer className="h-2 w-12" />
      </div>
    </div>
  );
}