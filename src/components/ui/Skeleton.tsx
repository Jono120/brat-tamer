/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SkeletonProps {
  className?: string;
}

/** Single shimmering placeholder block. */
export const Skeleton = ({ className = "" }: SkeletonProps) => (
  <div aria-hidden="true" className={`skeleton rounded-2xl ${className}`} />
);

/** Grid of sticker-shaped skeletons for the home screen loading state. */
export const StickerGridSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="grid grid-cols-2 gap-4" aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton key={i} className="h-32 rounded-[32px]" />
    ))}
  </div>
);

/** Vertical list of skeleton rows. */
export const ListSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-3" aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton key={i} className="h-16" />
    ))}
  </div>
);
