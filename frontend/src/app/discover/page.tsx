"use client";

import { useState } from "react";
import { LockedShelf } from "@/components/discover/locked-shelf";
import { Shelf } from "@/components/discover/shelf";
import { Segmented } from "@/components/ui/segmented";
import { comfortable, learner, stretch } from "@/lib/fixtures";
import type { ContentKind } from "@/lib/types";

type Filter = ContentKind | "all";

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "video", label: "Video" },
  { value: "article", label: "Article" },
  { value: "book", label: "Book" },
];

export default function DiscoverPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const keep = (kind: ContentKind) => filter === "all" || filter === kind;

  return (
    <div className="flex flex-col gap-[22px] px-5 pt-6 pb-28 sm:px-8 lg:px-11 lg:pt-8 lg:pb-9">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-[26px] leading-tight sm:text-[30px]">
            Ready for you this week
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            From your {learner.knownWords.toLocaleString()} known words and{" "}
            {learner.finishedTexts} finished texts. You keep looking up 〜ていく
            forms, so three of these lean on them.
          </p>
        </div>
        <Segmented
          label="Content type"
          size="sm"
          value={filter}
          options={filters}
          onChange={setFilter}
        />
      </div>

      <Shelf
        title="Comfortable"
        band="90%+ expected"
        guidance="read for pleasure — look up almost nothing"
        tone="comfortable"
        items={comfortable.filter((item) => keep(item.kind))}
      />

      <Shelf
        title="A stretch"
        band="75–89% expected"
        guidance="where the SRS gets fed — expect the popup open often"
        tone="stretch"
        items={stretch.filter((item) => keep(item.kind))}
      />

      <LockedShelf />
    </div>
  );
}
