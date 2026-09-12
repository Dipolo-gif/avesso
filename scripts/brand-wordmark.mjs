// Optimize the imagegen-edited wordmark without changing its artwork.
import sharp from 'sharp';
const source=process.argv[2];
if(!source)throw new Error('Usage: node scripts/brand-wordmark.mjs <approved-transparent-png>');
const meta=await sharp(source).metadata();
if(!meta.hasAlpha)throw new Error('The logo must have a transparent background.');
await sharp(source).trim().resize({width:1000}).png({compressionLevel:9}).toFile('dist/assets/logo-duavesso.png');
