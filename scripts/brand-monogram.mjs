// Export the imagegen artwork at delivery sizes, preserving its transparency.
import sharp from 'sharp';
import {readFile,writeFile} from 'node:fs/promises';
const source=process.argv[2];
if(!source)throw new Error('Usage: node scripts/brand-monogram.mjs <generated-png>');
await sharp(source).resize({width:1024}).png({compressionLevel:9}).toFile('dist/assets/duavesso-monogram.png');
await sharp(source).resize({width:192}).png({compressionLevel:9}).toFile('dist/assets/duavesso-icon-192.png');
// O favicon é montado por scripts/brand-favicon.mjs (usa a marca recortada, ampliada).
