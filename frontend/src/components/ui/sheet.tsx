"use client";

import { useCallback, useEffect, useRef } from "react";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  label: string;
  /** Share of the viewport the panel is allowed to take. */
  height?: string;
  children: React.ReactNode;
};

/** A panel that rises from the bottom edge. Phones have no room for a rail
 *  beside the text and no reliable anchor for a floating popup, so anything
 *  that sits alongside the reader on a desktop arrives from below here.
 *
 *  Built on native <dialog> rather than a positioned div: showModal() puts the
 *  panel in the top layer and makes the rest of the page inert, so the reader
 *  behind it cannot be tabbed into or read out while the sheet is up. */
export function Sheet({ open, onClose, label, height = "78svh", children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      // The scrim covers the page, but the page behind it would still scroll.
      document.body.style.overflow = "hidden";
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const close = useCallback(() => {
    document.body.style.overflow = "";
    onClose();
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClose={close}
      // The backdrop is part of the dialog box, so a click that lands on the
      // element itself rather than on the panel inside it is a dismiss.
      onClick={(event) => {
        if (event.target === ref.current) close();
      }}
      className="m-0 max-h-none w-full max-w-none border-0 bg-transparent p-0 backdrop:animate-[veil-in_0.18s_ease-out] backdrop:bg-neutral-900/45 open:fixed open:inset-0 open:flex open:flex-col open:justify-end"
    >
      <div
        style={{ height }}
        className="flex animate-[sheet-rise_0.22s_ease-out] flex-col rounded-t-[var(--radius-lg)] bg-[var(--color-ground-raised)] pt-2.5 text-[var(--color-ink)] shadow-lg"
      >
        <span
          aria-hidden
          className="mx-auto mb-1 h-1 w-10 flex-none rounded-full bg-[var(--color-neutral-400)]"
        />
        {children}
      </div>
    </dialog>
  );
}
