/**
 * What the editor's service worker may keep, and how. Only the editor's own
 * shell and build files under /admin/ are cached. The API (draft, ops,
 * publish), the connector, previews, media and the sign-in page always go to
 * the network untouched.
 */
export type Rule = "shell" | "asset" | "static" | null;

export function cacheRule(url: string, method: string, origin: string, navigate: boolean): Rule {
  if (method !== "GET") return null;
  const u = new URL(url, origin);
  if (u.origin !== origin) return null;
  const p = u.pathname;
  if (!(p === "/admin" || p.startsWith("/admin/"))) return null;
  if (p === "/admin/login" || p.startsWith("/admin/login/") || p === "/admin/sw.js") return null;
  // Hashed build files never change under the same name.
  if (p.startsWith("/admin/assets/")) return "asset";
  if (/^\/admin\/(manifest\.webmanifest|app-icon-\d+\.png)$/.test(p)) return "static";
  // Any page in the editor gets the same single-page shell.
  if (navigate || p === "/admin" || p === "/admin/") return "shell";
  return null;
}

/** Only plain, successful, same-origin answers are kept (never a redirect to sign in). */
export const cacheable = (res: { ok: boolean; type: string; redirected: boolean }) => res.ok && res.type === "basic" && !res.redirected;
