// Deriva a marca compacta "dv" para o cabeçalho a partir do monograma:
// tira o fundo branco (chroma-key) e recorta a folga, para assentar em qualquer cor.
import sharp from 'sharp';
const SRC = process.argv[2] || 'dist/assets/duavesso-monogram.png';
const OUT = 'dist/assets/duavesso-mark.png';

const {data, info} = await sharp(SRC).ensureAlpha().raw().toBuffer({resolveWithObject: true});
const px = info.width * info.height;
for (let i = 0; i < px; i++) {
  const o = i * info.channels;
  const r = data[o], g = data[o + 1], b = data[o + 2];
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const chroma = max - min;
  // Azul (alta saturação) e preto (baixo valor) ficam opacos; branco/cinza claro somem.
  let alpha;
  if (chroma > 35) alpha = 255;          // traço azul
  else if (min <= 55) alpha = 255;        // traço preto sólido
  else if (min >= 230) alpha = 0;         // fundo branco/cinza claro -> some
  else alpha = Math.round(255 * (230 - min) / 175); // pena nas bordas antialiased
  data[o + 3] = alpha;
}
const mark = sharp(data, {raw: {width: info.width, height: info.height, channels: info.channels}})
  .png()
  .trim({threshold: 1});                  // remove a moldura totalmente transparente
const buf = await mark.toBuffer();
const meta = await sharp(buf).metadata();
await sharp(buf).resize({height: 120}).png({compressionLevel: 9}).toFile(OUT);
const outMeta = await sharp(OUT).metadata();
console.log(`trimmed ${meta.width}x${meta.height} -> ${OUT} ${outMeta.width}x${outMeta.height}`);
