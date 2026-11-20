import { useSyncExternalStore } from "react";

/** The editor's phone layout: under 768px wide. Touch behaviour itself follows the pointer type, at any width. */
export const PHONE_MAX = 767;
const query = `(max-width: ${PHONE_MAX}px)`;

export const isPhone = () => typeof window !== "undefined" && window.matchMedia(query).matches;

export function usePhone(): boolean {
  return useSyncExternalStore(
    (l) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", l);
      return () => mq.removeEventListener("change", l);
    },
    isPhone,
  );
}

/**
 * A touch-only device (a phone or tablet with no mouse or trackpad): no hover and a coarse
 * pointer. A touch laptop with a trackpad doesn't count, so its keyboard shortcuts stay.
 */
export const TOUCH_ONLY_QUERY = "(hover: none) and (pointer: coarse)";
export const isTouchOnly = () => typeof window !== "undefined" && !!window.matchMedia?.(TOUCH_ONLY_QUERY).matches;
