"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { learner } from "@/lib/fixtures";
import { useReaderSettings } from "@/features/reader";

/** SRS is drawn in the design but has no route yet, so it renders as
 *  present-but-inert rather than as a link that goes nowhere. */
const nav = [
  { label: "SRS", glyph: "札", badge: String(learner.srsDue), href: null },
  { label: "Reader", glyph: "読", badge: null, href: "/reader" },
  { label: "Discover", glyph: "探", badge: null, href: "/discover" },
  { label: "Tutor", glyph: "話", badge: null, href: "/tutor" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { pairing } = useReaderSettings();
  const pathname = usePathname();

  return (
    <div
      data-pairing={pairing}
      className="flex min-h-svh flex-col bg-[var(--color-ground)] text-[var(--color-ink)]"
    >
      <header className="flex h-[60px] flex-none items-center gap-4 bg-[var(--color-ground-raised)] px-5 lg:h-[68px] lg:gap-[26px] lg:px-7">
        <Link href="/reader" className="flex items-center gap-2.5 no-underline">
          <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-[var(--color-voice)] font-heading text-[17px] text-[var(--color-voice-contrast)]">
            読
          </span>
          <span className="font-heading text-[19px] text-[var(--color-ink)]">Yabai</span>
        </Link>

        <nav aria-label="Sections" className="ml-2.5 hidden gap-1 lg:flex">
          {nav.map((item) => (
            <DeskLink key={item.label} item={item} pathname={pathname} />
          ))}
        </nav>

        <div className="flex-1" />

        <p className="flex items-center gap-2 text-[13px] text-neutral-700">
          <span className="h-[9px] w-[9px] flex-none rounded-full bg-accent-2-500" />
          <span className="hidden sm:inline">
            {learner.knownWords.toLocaleString()} words known · {learner.level}
          </span>
          <span className="sm:hidden">
            {learner.knownWords.toLocaleString()} · {learner.level}
          </span>
        </p>
        <span
          aria-hidden
          className="hidden h-[34px] w-[34px] rounded-full bg-accent-2-300 sm:block"
        />
      </header>

      {/* Grows with its content, so a long passage scrolls the page. Panels
          that scroll internally bound their own height rather than relying on
          a clamp here. */}
      <main className="flex flex-1 flex-col">{children}</main>

      {/* Phones get the sections as a thumb-reachable bar instead of a header
          row that would have to shrink past the point of being tappable. */}
      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-30 flex flex-none border-t border-[var(--color-inset)] bg-[var(--color-ground-raised)] pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {nav.map((item) => (
          <TabLink key={item.label} item={item} pathname={pathname} />
        ))}
      </nav>
    </div>
  );
}

type NavItem = (typeof nav)[number];

function DeskLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const shared = "rounded-full px-4 py-2 text-sm font-semibold transition-colors";

  if (!item.href) {
    return (
      <span
        aria-disabled="true"
        title="Not built yet"
        className={`${shared} cursor-default text-neutral-700 opacity-55`}
      >
        {item.label}
        {item.badge ? <span className="opacity-65"> {item.badge}</span> : null}
      </span>
    );
  }

  const current = item.href === pathname;
  return (
    <Link
      href={item.href}
      aria-current={current ? "page" : undefined}
      className={`${shared} no-underline ${
        current
          ? "bg-accent-2-200 text-accent-2-800"
          : "text-neutral-700 hover:text-neutral-900"
      }`}
    >
      {item.label}
    </Link>
  );
}

function TabLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const shared =
    "relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold no-underline";

  const badge = item.badge ? (
    <span className="absolute top-1.5 right-[calc(50%-22px)] rounded-full bg-[var(--color-voice)] px-1.5 py-px text-[10px] text-[var(--color-voice-contrast)]">
      {item.badge}
    </span>
  ) : null;

  if (!item.href) {
    return (
      <span
        aria-disabled="true"
        className={`${shared} cursor-default text-neutral-600 opacity-50`}
      >
        <span aria-hidden className="font-jp text-[19px] leading-none">
          {item.glyph}
        </span>
        {item.label}
        {badge}
      </span>
    );
  }

  const current = item.href === pathname;
  return (
    <Link
      href={item.href}
      aria-current={current ? "page" : undefined}
      className={`${shared} ${
        current ? "text-[var(--color-voice)]" : "text-neutral-600"
      }`}
    >
      <span aria-hidden className="font-jp text-[19px] leading-none">
        {item.glyph}
      </span>
      {item.label}
      {badge}
    </Link>
  );
}
