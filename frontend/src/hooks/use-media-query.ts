"use client";

import { useEffect, useState } from "react";

/** Starts false on both server and first client render, so hydration matches,
 *  then settles to the real answer. Callers must treat false as "not yet
 *  known" rather than as a positive claim about a small screen. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const list = window.matchMedia(query);
    setMatches(list.matches);

    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
