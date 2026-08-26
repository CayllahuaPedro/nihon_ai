import type { Recommendation } from "@/lib/types";
import { ComprehensionDial } from "./comprehension-dial";
import { ImageSlot } from "../ui/image-slot";

type ShelfProps = {
  title: string;
  band: string;
  guidance: string;
  tone: "comfortable" | "stretch";
  items: Recommendation[];
};

export function Shelf({ title, band, guidance, tone, items }: ShelfProps) {
  const bandClass =
    tone === "comfortable"
      ? "bg-accent-2-200 text-accent-2-800"
      : "bg-accent-200 text-accent-800";

  return (
    <section className="flex flex-col gap-3">
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="font-heading text-[17px]">{title}</h2>
        <span
          className={`${bandClass} rounded-full px-[11px] py-1 text-xs font-bold tracking-[0.05em] uppercase`}
        >
          {band}
        </span>
        <p className="text-[13px] text-[var(--color-muted)]">{guidance}</p>
      </header>

      <ul className="m-0 grid list-none grid-cols-1 gap-5 p-0 lg:grid-cols-3">
        {items.map((item) =>
          tone === "comfortable" ? (
            <FeatureCard key={item.id} item={item} />
          ) : (
            <CompactCard key={item.id} item={item} />
          ),
        )}
      </ul>
    </section>
  );
}

function FeatureCard({ item }: { item: Recommendation }) {
  return (
    <li className="flex flex-col overflow-hidden rounded-lg bg-[var(--color-raised)] text-[var(--color-raised-ink)] shadow-sm">
      <div className="relative h-[152px]">
        <ImageSlot description={item.imageDescription} />
        <span className="absolute top-3 left-3 rounded-full bg-[var(--color-ground)] px-2.5 py-1 text-[11px] font-bold tracking-[0.06em] text-accent-800 uppercase">
          {item.kind} · {item.extent}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 px-[18px] pt-4 pb-[18px]">
        <div>
          <h3 className="font-jp text-[19px] leading-[1.35]">{item.japaneseTitle}</h3>
          <p className="mt-[3px] text-[13px] text-[var(--color-muted)]">
            {item.source}
          </p>
        </div>
        <span className="flex-1" />
        <div className="flex items-center gap-3.5">
          <ComprehensionDial
            value={item.expectedComprehension}
            tone="comfortable"
            size="lg"
            centerClassName="bg-[var(--color-raised)]"
          />
          <p className="text-[13px] leading-[1.5] whitespace-pre-line text-[var(--color-muted)]">
            {item.note}
          </p>
        </div>
      </div>
    </li>
  );
}

function CompactCard({ item }: { item: Recommendation }) {
  return (
    <li className="flex items-center gap-3.5 rounded-lg bg-[var(--color-ground-raised)] p-3.5">
      <div className="h-[92px] w-[92px] flex-none overflow-hidden rounded-md">
        <ImageSlot description={item.imageDescription} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="text-[11px] font-bold tracking-[0.06em] text-accent-800 uppercase">
          {item.kind} · {item.extent}
        </p>
        <h3 className="font-jp text-base leading-[1.3]">{item.japaneseTitle}</h3>
        <div className="flex items-center gap-2.5">
          <ComprehensionDial
            value={item.expectedComprehension}
            tone="stretch"
            size="sm"
            centerClassName="bg-[var(--color-ground-raised)]"
          />
          <p className="text-xs text-[var(--color-muted)]">{item.note}</p>
        </div>
      </div>
    </li>
  );
}
