import sharp from 'sharp';
import {mkdir, readdir, stat} from 'node:fs/promises';
import path from 'node:path';

const SRC = 'assets-src', OUT = 'dist/assets';
const PLAN = {
  editorial: {widths: [768, 1200, 1536], fallback: 1536},
  'tee-black': {widths: [400, 800, 1000, 1254], fallback: 1254},
  'tee-white': {widths: [400, 800, 1000, 1254], fallback: 1254}
};

await mkdir(OUT, {recursive: true});
let total = 0;
for (const file of await readdir(SRC)) {
  const name = path.parse(file).name, plan = PLAN[name];
  if (!plan) continue;
  const input = sharp(path.join(SRC, file));
  for (const width of plan.widths) {
    const out = path.join(OUT, `${name}-${width}.webp`);
    await input.clone().resize({width, withoutEnlargement: true}).webp({quality: 82, effort: 6}).toFile(out);
    total += (await stat(out)).size;
  }
  const jpg = path.join(OUT, `${name}-${plan.fallback}.jpg`);
  await input.clone().resize({width: plan.fallback, withoutEnlargement: true}).jpeg({quality: 84, mozjpeg: true}).toFile(jpg);
  total += (await stat(jpg)).size;
  console.log(`${name}: ${plan.widths.map(w => `${w}.webp`).join(', ')} + ${plan.fallback}.jpg`);
}
console.log(`Total em dist/assets: ${(total / 1024).toFixed(0)} KB`);
