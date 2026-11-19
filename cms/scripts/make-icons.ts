// Make the share image and favicons from the clover (art/app-icon-1024.png) into static/.
// Run once when the clover changes: npx tsx scripts/make-icons.ts. The outputs are committed.
//   static/og.png               1200×630, the clover centred at 60% of the height on pure black
//   static/favicon.ico          16 and 32 px (PNG-in-ICO)
//   static/favicon-32.png, favicon-16.png, apple-touch-icon.png (180)
import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const cms = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(cms, "../art/app-icon-1024.png");
const out = (f: string) => resolve(cms, "static", f);

const side = Math.round(630 * 0.6);
const clover = await sharp(src).resize(side, side).png().toBuffer();
await sharp({ create: { width: 1200, height: 630, channels: 3, background: "#000000" } })
  .composite([{ input: clover, left: Math.round((1200 - side) / 2), top: Math.round((630 - side) / 2) }])
  .png({ compressionLevel: 9 })
  .toFile(out("og.png"));

const png = (size: number) => sharp(src).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
const [p16, p32, p180] = await Promise.all([png(16), png(32), png(180)]);
writeFileSync(out("favicon-16.png"), p16);
writeFileSync(out("favicon-32.png"), p32);
writeFileSync(out("apple-touch-icon.png"), p180);

/** An .ico holding PNG images (supported by every current browser). */
function ico(images: { size: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}
writeFileSync(out("favicon.ico"), ico([{ size: 16, data: p16 }, { size: 32, data: p32 }]));
console.log("make-icons: og.png, favicon.ico, favicon-16/32.png, apple-touch-icon.png → static/");
