// Pixel comparison of the homepage captures made by compare-home.mjs.
//   node scripts/diff-home.mjs
// Prints, per width, how many pixels differ noticeably, and where (in 100px-tall bands), and writes
// docs/screenshots/homepage-compare/diff-<width>.png (differences in pink over a faded original).
import sharp from "sharp";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "docs/screenshots/homepage-compare");
const THRESHOLD = 40; // per-channel difference (0-255) that counts as a visible change

for (const width of ["390", "1440"]) {
  const [a, b] = await Promise.all(["original", "cms"].map((n) => sharp(`${dir}/${n}-${width}.png`).removeAlpha().raw().toBuffer({ resolveWithObject: true })));
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) {
    console.log(`${width}px: sizes differ: original ${a.info.width}×${a.info.height}, cms ${b.info.width}×${b.info.height}`);
    continue;
  }
  const { width: W, height: H } = a.info;
  const out = Buffer.alloc(W * H * 3);
  const bands = new Map();
  let changed = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3;
      const d = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2]));
      if (d > THRESHOLD) {
        changed++;
        const band = Math.floor(y / 100) * 100;
        bands.set(band, (bands.get(band) ?? 0) + 1);
        out[i] = 255; out[i + 1] = 45; out[i + 2] = 149;
      } else {
        const g = 255 - (255 - (a.data[i] * 0.3 + a.data[i + 1] * 0.59 + a.data[i + 2] * 0.11)) * 0.25;
        out[i] = out[i + 1] = out[i + 2] = g;
      }
    }
  }
  await sharp(out, { raw: { width: W, height: H, channels: 3 } }).png().toFile(`${dir}/diff-${width}.png`);
  const top = [...bands].sort((p, q) => q[1] - p[1]).slice(0, 6).map(([y, n]) => `y ${y}-${y + 100}: ${n}px`);
  console.log(`${width}px: ${W}×${H}, ${changed} of ${W * H} pixels differ (${((changed / (W * H)) * 100).toFixed(3)}%)${top.length ? "\n   " + top.join("\n   ") : ""}`);
}
