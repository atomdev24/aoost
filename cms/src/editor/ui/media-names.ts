/** A file name for the tag on a thumbnail: no extension, no upload hash. "orchard-hero.a1b2c3.jpg" → "orchard-hero". */
export function tagName(name: string): string {
  return name.replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[.-][a-f0-9]{8,}$/i, "");
}

const VERSION_SUFFIX = /(?:[-_ ](?:v\d+|\d{1,2}|copy|final|mobile|phone|desktop|wide|tall|square|dark|light|crop(?:ped)?|small|large|sm|lg)|@\dx| \(\d+\))+$/i;

/** Files that are versions of one picture share this key: "orchard-hero-mobile" and "orchard-hero-v2" → "orchard-hero". */
export function versionKey(name: string): string {
  return tagName(name).replace(VERSION_SUFFIX, "").toLowerCase();
}

/** How many versions each key has. */
export function versionCounts(names: string[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const n of names) out.set(versionKey(n), (out.get(versionKey(n)) ?? 0) + 1);
  return out;
}
