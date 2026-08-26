/**
 * Stands in for artwork the content pipeline hasn't attached yet. It states
 * what belongs there rather than faking a photo, so an empty slot reads as
 * pending rather than broken.
 */
export function ImageSlot({ description }: { description: string }) {
  return (
    <div
      role="img"
      aria-label={description}
      className="flex h-full w-full items-end bg-accent-2-200 p-3"
    >
      <span className="text-[11px] leading-snug text-accent-2-800/70">
        {description}
      </span>
    </div>
  );
}
