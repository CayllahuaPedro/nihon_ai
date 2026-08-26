"use client";

type SegmentedProps<T extends string> = {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  size?: "sm" | "md";
};

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  size = "md",
}: SegmentedProps<T>) {
  const padding = size === "sm" ? "px-4 py-2 text-[13px]" : "px-[18px] py-2 text-[13px]";

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-surface p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`${padding} flex-none cursor-pointer rounded-full font-semibold transition-colors ${
              selected
                ? "bg-[var(--color-voice)] text-[var(--color-voice-contrast)]"
                : "text-neutral-700 hover:text-neutral-900"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
