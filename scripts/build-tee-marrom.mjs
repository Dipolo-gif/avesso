// Assets dos 2 produtos de foto marrom (3 poses cada) — otimizados p/ web.
import sharp from 'sharp';
const BASE = 'C:/Users/franc/.codex/generated_images/01a0986c-a7cd-7093-953e-52fdfbc188e3';
const SETS = {
  'tee-faces': [   // Mulher · Estampa 1 (duas faces) — Frente, 1.4 (andando), Costas
    `${BASE}/Mulher Marrom Estampa 1 - Frente.png`,
    `${BASE}/Mulher Marrom Estampa 1 - 1.4.png`,
    `${BASE}/Mulher Marrom Estampa 1 - Costas (1).png`,
  ],
  'tee-eclipse': [ // Homem · Eclipse — Frente, Lado (andando), Costa
    `${BASE}/Homem Marrom - Frente.png`,
    `${BASE}/Homem Marrom - Lado.png`,
    `${BASE}/Homem Marrom - Costa.png`,
  ],
};
const WIDTHS = [400, 800, 1024];
for (const [name, srcs] of Object.entries(SETS)) {
  for (let i = 0; i < srcs.length; i++) {
    const n = i + 1;
    for (const w of WIDTHS) await sharp(srcs[i]).resize({width: w}).webp({quality: 80}).toFile(`dist/assets/${name}-${n}-${w}.webp`);
    await sharp(srcs[i]).resize({width: 1024}).jpeg({quality: 82, mozjpeg: true}).toFile(`dist/assets/${name}-${n}-1024.jpg`);
    console.log(`${name}-${n}: ${WIDTHS.length} webp + 1 jpg`);
  }
}
