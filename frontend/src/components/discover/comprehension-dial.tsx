type ComprehensionDialProps = {
  /** Percent of the text the learner model expects you to already know. */
  value: number;
  /** `comfortable` reads in the sage voice, `stretch` in the terracotta one. */
  tone: "comfortable" | "stretch";
  size: "lg" | "sm";
  /** Background of the disc the ring sits on, so the centre punches through. */
  centerClassName: string;
};

const sizing = {
  lg: { outer: "h-[54px] w-[54px]", inner: "h-[42px] w-[42px]", type: "text-sm" },
  sm: { outer: "h-10 w-10", inner: "h-[31px] w-[31px]", type: "text-[11px]" },
};

const fill = {
  comfortable: "var(--color-accent-2-500)",
  stretch: "var(--color-accent-500)",
};

export function ComprehensionDial({
  value,
  tone,
  size,
  centerClassName,
}: ComprehensionDialProps) {
  const { outer, inner, type } = sizing[size];

  return (
    <div
      role="img"
      aria-label={`${value}% expected comprehension`}
      className={`${outer} flex flex-none items-center justify-center rounded-full`}
      style={{
        background: `conic-gradient(${fill[tone]} ${value}%, var(--color-neutral-300) 0)`,
      }}
    >
      <div
        className={`${inner} ${centerClassName} flex items-center justify-center rounded-full font-heading ${type}`}
      >
        {value}%
      </div>
    </div>
  );
}
