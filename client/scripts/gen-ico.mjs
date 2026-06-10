/**
 * 从 PNG 生成包含多尺寸的 ICO 文件（纯 Node.js，无额外依赖）
 * 用法: node scripts/gen-ico.mjs
 */
import fs from 'fs';
import https from 'https';
import http from 'http';
import { createCanvas, loadImage } from 'canvas';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '../public/icon_512.png');
const DEST = path.resolve(__dirname, '../build/icon.ico');
const SIZES = [16, 32, 48, 256];

async function buildIco() {
  const img = await loadImage(SRC);
  const pngBuffers = [];

  for (const size of SIZES) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, size, size);
    pngBuffers.push(canvas.toBuffer('image/png'));
  }

  // ICO header
  const count = SIZES.length;
  const headerSize = 6 + count * 16;
  let offset = headerSize;

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);     // reserved
  header.writeUInt16LE(1, 2);     // type: icon
  header.writeUInt16LE(count, 4); // count

  const dirEntries = [];
  for (let i = 0; i < count; i++) {
    const size = SIZES[i];
    const png = pngBuffers[i];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);  // width (0 = 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1);  // height
    entry.writeUInt8(0, 2);   // color count
    entry.writeUInt8(0, 3);   // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bit count
    entry.writeUInt32LE(png.length, 8);  // size of image data
    entry.writeUInt32LE(offset, 12);     // offset
    dirEntries.push(entry);
    offset += png.length;
  }

  const ico = Buffer.concat([header, ...dirEntries, ...pngBuffers]);
  fs.writeFileSync(DEST, ico);
  console.log(`icon.ico generated: ${DEST} (${ico.length} bytes, sizes: ${SIZES.join(',')})`);
}

buildIco().catch(e => { console.error(e); process.exit(1); });
