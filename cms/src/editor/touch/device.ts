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
