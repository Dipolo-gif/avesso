// Favicon: a marca dv recortada (transparente), AMPLIADA sobre um ladrilho claro
// arredondado — o ladrilho mantém o traço preto/azul visível em abas escuras.
import {readFileSync, writeFileSync} from 'node:fs';
import sharp from 'sharp';
const MARK = 'dist/assets/duavesso-mark.png';
const {width, height} = await sharp(MARK).metadata();
// Encaixa a marca em ~156px de largura, centralizada no ladrilho 192.
const w = 156, h = Math.round(w * height / width), x = Math.round((192 - w) / 2), y = Math.round((192 - h) / 2);
const b64 = readFileSync(MARK).toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><title>Duavesso — dv</title>`
  + `<rect width="192" height="192" rx="40" fill="#f7f8f9"/>`
  + `<image x="${x}" y="${y}" width="${w}" height="${h}" href="data:image/png;base64,${b64}"/></svg>\n`;
writeFileSync('dist/favicon.svg', svg);
console.log(`favicon.svg atualizado: marca ${w}x${h} no ladrilho 192 (x=${x}, y=${y})`);
