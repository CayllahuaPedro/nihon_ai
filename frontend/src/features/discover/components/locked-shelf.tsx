import { learner } from "@/lib/fixtures";
import { locked } from "../fixtures";
import { shelfProgress } from "../model/shelves";

export function LockedShelf() {
  const progress = shelfProgress(learner.knownWords, learner.nextShelfAt);

  return (
    <section className="flex flex-wrap items-center gap-x-[22px] gap-y-4 rounded-lg bg-accent-2-100 px-5 py-[18px] text-accent-2-900 sm:px-[22px]">
      <div className="min-w-0">
        <h2 className="font-heading text-[17px]">
          Not yet — around {learner.nextShelfAt.toLocaleString()} known words
        </h2>
        <p className="mt-[3px] text-[13px] text-accent-2-800">
          Two you saved. We&apos;ll move them up as your known count grows.
        </p>
      </div>

      <ul className="m-0 flex list-none flex-wrap items-center gap-2.5 p-0">
        {locked.map((item) => (
          <li
            key={item.id}
            className="rounded-full bg-neutral-100 px-3.5 py-[7px] font-jp text-sm"
          >
            {item.japaneseTitle}{" "}
            <span className="font-body font-bold text-neutral-600">
              {item.expectedComprehension}%
            </span>
          </li>
        ))}
      </ul>

      <span className="hidden flex-1 lg:block" />

      <div className="flex w-full flex-col gap-1.5 lg:w-[220px]">
        <p className="flex justify-between text-xs text-accent-2-800">
          <span>{learner.knownWords.toLocaleString()}</span>
          <span>{learner.nextShelfAt.toLocaleString()}</span>
        </p>
        <div
          role="progressbar"
          aria-valuenow={learner.knownWords}
          aria-valuemin={0}
          aria-valuemax={learner.nextShelfAt}
          aria-label="Progress toward the next shelf"
          className="h-2 overflow-hidden rounded-full bg-accent-2-200"
        >
          <div
            className="h-full bg-accent-2-600"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </section>
  );
}
