export function ThinkingDots() {
  return (
    <p
      role="status"
      className="flex max-w-[92%] items-center gap-1.5 self-start rounded-[18px_18px_18px_6px] bg-[var(--color-raised)] px-[18px] py-[19px]"
    >
      <span className="sr-only">The tutor is answering</span>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          aria-hidden
          style={{ animationDelay: `${index * 0.16}s` }}
          className="h-1.5 w-1.5 animate-[thinking_1.1s_ease-in-out_infinite] rounded-full bg-[var(--color-voice)]"
        />
      ))}
    </p>
  );
}
