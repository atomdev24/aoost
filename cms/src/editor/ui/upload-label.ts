import type { Upload } from "../uploads";

/** "12.4 MB of 80 MB · about 40 s left" */
export function progressLabel(u: Upload, now = Date.now()): string {
  const mb = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
  if (u.status === "preparing") return "Getting it ready…";
  if (u.status !== "uploading") return "";
  const head = `${mb(u.loaded)} of ${mb(u.total)}`;
  const spent = u.sendingSince !== undefined ? (now - u.sendingSince) / 1000 : 0;
  if (spent < 1.5 || u.loaded <= 0) return head;
  if (u.loaded >= u.total) return `${head} · finishing…`;
  const left = ((u.total - u.loaded) / u.loaded) * spent;
  const when = left < 5 ? "a few seconds" : left < 60 ? `about ${Math.round(left / 5) * 5} s` : `about ${Math.round(left / 60)} min`;
  return `${head} · ${when} left`;
}

