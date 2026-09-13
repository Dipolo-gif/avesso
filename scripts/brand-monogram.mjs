// Export the imagegen artwork at delivery sizes, preserving its transparency.
import sharp from 'sharp';
import {readFile,writeFile} from 'node:fs/promises';
const source=process.argv[2];
if(!source)throw new Error('Usage: node scripts/brand-monogram.mjs <generated-png>');
await sharp(source).resize({width:1024}).png({compressionLevel:9}).toFile('dist/assets/duavesso-monogram.png');
await sharp(source).resize({width:192}).png({compressionLevel:9}).toFile('dist/assets/duavesso-icon-192.png');
// SVG is the UI container: a light tile keeps black lettering visible in dark tabs.
const icon=(await readFile('dist/assets/duavesso-icon-192.png')).toString('base64');
await writeFile('dist/favicon.svg',`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><title>Duavesso — dv</title><rect width="192" height="192" rx="38" fill="#f7f8f9"/><image width="192" height="192" href="data:image/png;base64,${icon}"/></svg>\n`);
