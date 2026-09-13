// Assets do produto de fotos "Heavy · Do Avesso" (3 poses) — otimizados p/ web.
// Fontes originais (geradas fora do repo, mantidas só como referência de proveniência):
import sharp from 'sharp';
const BASE = 'C:/Users/franc/.codex/generated_images/01a0986c-a7cd-7093-953e-52fdfbc188e3';
const SRC = {
  1: `${BASE}/Homem de Preto, Estampa 1 -Frente.png`,   // frente parada (preto sólido, cor corrigida)
  2: `${BASE}/Homem de Preto, Estampa 1 -Lado (1).png`, // frente andando
  3: `${BASE}/Homem de Preto, Estampa 1 -Costas.png`,   // costas
};
const WIDTHS = [400, 800, 1024];
for (const [n, src] of Object.entries(SRC)) {
  for (const w of WIDTHS) {
    await sharp(src).resize({width: w}).webp({quality: 80}).toFile(`dist/assets/tee-porta-${n}-${w}.webp`);
  }
  await sharp(src).resize({width: 1024}).jpeg({quality: 82, mozjpeg: true}).toFile(`dist/assets/tee-porta-${n}-1024.jpg`);
  console.log(`pose ${n}: ${WIDTHS.length} webp + 1 jpg`);
}
