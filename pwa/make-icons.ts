/**
 * Draws the generic app icon (an orange tile with a round red-white-blue badge) as PNGs in public/icons.
 * Run with `npx tsx pwa/make-icons.ts` after changing the design; the PNGs are committed.
 */
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

type Rgb = [number, number, number];

const ORANGE: Rgb = [0xf3, 0x6c, 0x21];
const RED: Rgb = [0xae, 0x1c, 0x28];
const WHITE: Rgb = [0xff, 0xff, 0xff];
const BLUE: Rgb = [0x21, 0x46, 0x8b];

/** Colour at a point in the unit square (0..1, 0..1). The badge stays inside the maskable safe zone. */
function colourAt(x: number, y: number): Rgb {
  const dx = x - 0.5;
  const dy = y - 0.5;
  const r = Math.hypot(dx, dy);
  const badge = 0.3;
  const ring = 0.035;
  if (r > badge + ring) return ORANGE;
  if (r > badge) return WHITE;
  const band = (dy + badge) / (2 * badge);
  return band < 1 / 3 ? RED : band < 2 / 3 ? WHITE : BLUE;
}

function rasterise(size: number): Buffer {
  const samples = 4;
  const rows: Buffer[] = [];
  for (let py = 0; py < size; py++) {
    const row = Buffer.alloc(1 + size * 3); // leading 0 = PNG filter "none"
    for (let px = 0; px < size; px++) {
      const sum = [0, 0, 0];
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const c = colourAt((px + (sx + 0.5) / samples) / size, (py + (sy + 0.5) / samples) / size);
          for (let i = 0; i < 3; i++) sum[i] += c[i];
        }
      }
      for (let i = 0; i < 3; i++) row[1 + px * 3 + i] = Math.round(sum[i] / (samples * samples));
    }
    rows.push(row);
  }
  return Buffer.concat(rows);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(data: Buffer): number {
  let c = 0xffffffff;
  for (const byte of data) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(size: number): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // truecolour RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rasterise(size), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = new URL('../public/icons/', import.meta.url);
for (const [name, size] of [
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
] as const) {
  writeFileSync(new URL(name, outDir), png(size));
  console.log(`wrote public/icons/${name}`);
}
