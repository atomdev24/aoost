const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/** Short random id, e.g. "n_k3x9a2bq". Uses crypto so it works in the Worker and the browser. */
export function newId(prefix = "n"): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return `${prefix}_${out}`;
}
