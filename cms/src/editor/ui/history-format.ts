/** "Today", "Yesterday", or "Mon 23 Nov": the day header a version sits under. */
export function dayLabel(at: string, now = new Date()): string {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return "Earlier";
  if (d.toDateString() === now.toDateString()) return "Today";
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short", ...(d.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }) });
}

/** "Alex Oostendurp" → "AO"; an email → its first letter. */
export function initials(who: string | null | undefined): string {
  if (!who) return "·";
  const name = who.split("@")[0]!.replace(/[._-]+/g, " ").trim();
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1]![0] : "")).toUpperCase() || "·";
}

