/**
 * A file's name as words, for lists and pickers: "/media/2026/hear-no-evil_3D-v2.png?w=480"
 * becomes "Hear no evil 3D v2". People recognise the picture; the name only backs it up.
 */
export function pictureName(url: string | undefined): string {
  if (!url) return "";
  let base = url.split("?")[0]!.split("#")[0]!.split("/").filter(Boolean).pop() ?? url;
  try {
    base = decodeURIComponent(base);
  } catch {
    /* keep as is */
  }
  const words = base
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/[-_.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return words ? words[0]!.toUpperCase() + words.slice(1) : base;
}
