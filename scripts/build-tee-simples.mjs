// Assets do produto "Simples" (liso, só o dv na manga) em 3 cores × 3 poses (Frente, Lado, Costas).
import sharp from 'sharp';
const BASE = 'C:/Users/franc/.codex/generated_images/01a0986c-a7cd-7093-953e-52fdfbc188e3';
const SETS = {
  'tee-simples-preto':  [`${BASE}/Estampa 5 - Preto Frente.png`,  `${BASE}/Estampa 5 - Preto Lado.png`,  `${BASE}/Estampa 5 - Preto Costas.png`],
  'tee-simples-branco': [`${BASE}/Estampa 5 - Branca Frente.png`, `${BASE}/Estampa 5 - Branca Lado.png`, `${BASE}/Estampa 5 - Branco Costas.png`],
  'tee-simples-marrom': [`${BASE}/Estampa 5 - Marrom Frente.png`, `${BASE}/Estampa 5 - Marrom Lado.png`, `${BASE}/Estampa 5 - Marrom Costas.png`],
};
const WIDTHS = [400, 800, 1024];
for (const [name, srcs] of Object.entries(SETS)) {
  for (let i = 0; i < srcs.length; i++) {
    const n = i + 1;
    for (const w of WIDTHS) await sharp(srcs[i]).resize({width: w}).webp({quality: 80}).toFile(`dist/assets/${name}-${n}-${w}.webp`);
    await sharp(srcs[i]).resize({width: 1024}).jpeg({quality: 82, mozjpeg: true}).toFile(`dist/assets/${name}-${n}-1024.jpg`);
  }
  console.log(`${name}: 3 poses`);
}
