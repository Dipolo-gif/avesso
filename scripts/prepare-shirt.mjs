// Rebuild the web garment from the MIT-licensed Poimandres example asset.
// Usage: node scripts/prepare-shirt.mjs path/to/shirt_baked_collapsed.glb
// Source revision and license: docs/studio-3d.md, dist/assets/tee-LICENSE.txt.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {BufferGeometry, BufferAttribute, Matrix4} from 'three';

const source=await fs.readFile(process.argv[2]);
if(createHash('sha256').update(source).digest('hex')!=='4c020995f86593348909fc6da64c390d60ef2a22f8a4d421f70aced70acc3725')throw new Error('Unexpected source asset; see docs/studio-3d.md for the pinned original.');
if(source.readUInt32LE(0)!==0x46546c67)throw new Error('Expected GLB');
const jsonLength=source.readUInt32LE(12);
const doc=JSON.parse(source.subarray(20,20+jsonLength));
const binary=source.subarray(28+jsonLength);
const slice=view=>binary.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength);
const position=new Float32Array(Uint8Array.from(slice(doc.bufferViews[0])).buffer);
const normal=new Float32Array(Uint8Array.from(slice(doc.bufferViews[1])).buffer);
const uv=new Float32Array(Uint8Array.from(slice(doc.bufferViews[2])).buffer);
const indices=new Uint16Array(Uint8Array.from(slice(doc.bufferViews[3])).buffer);
const geometry=new BufferGeometry();
geometry.setAttribute('position',new BufferAttribute(position,3));
geometry.setAttribute('normal',new BufferAttribute(normal,3));
geometry.setAttribute('uv',new BufferAttribute(uv,2));
geometry.setIndex(new BufferAttribute(indices,1));
// Preserve authored drape and stitching. Slightly wider, shallower relaxed silhouette.
const height=doc.accessors[0].max[1]-doc.accessors[0].min[1];
const scale=.70/height;
geometry.applyMatrix4(new Matrix4().makeScale(scale*1.10,scale,scale*.86));
// Ease the fitted waist into a straighter, loose body without changing the neckline.
const lower=doc.accessors[0].min[1]*scale;
for(let i=0;i<position.length;i+=3){
  const t=(position[i+1]-lower)/.70;
  const fade=Math.max(0,Math.min(1,(.60-t)/.16));
  const ease=.16+.09*Math.exp(-Math.pow((t-.38)/.22,2));
  position[i]*=1+ease*fade*fade*(3-2*fade);
}
geometry.computeVertexNormals();
geometry.computeBoundingBox();
doc.accessors[0].min=geometry.boundingBox.min.toArray();
doc.accessors[0].max=geometry.boundingBox.max.toArray();
const parts=[Buffer.from(position.buffer),Buffer.from(normal.buffer),Buffer.from(uv.buffer),Buffer.from(indices.buffer)];
let offset=0;
doc.bufferViews=parts.map(part=>{const view={buffer:0,byteOffset:offset,byteLength:part.length};offset+=Math.ceil(part.length/4)*4;return view;});
const packed=Buffer.alloc(offset);
parts.forEach((part,i)=>part.copy(packed,doc.bufferViews[i].byteOffset));
doc.buffers=[{byteLength:packed.length}];
doc.asset.copyright='Copyright (c) 2024 Poimandres. MIT License. Adapted for doavesso.';
doc.nodes=[{mesh:0,name:'Tee'}];doc.scenes=[{nodes:[0]}];doc.scene=0;
doc.meshes[0].name='Tee';
doc.materials=[{name:'Cotton',doubleSided:true,pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:0,roughnessFactor:.92}}];
// Separate local textures avoid Blob URLs under the site's existing CSP.
const original=JSON.parse(source.subarray(20,20+jsonLength));
await sharp(slice(original.bufferViews[5])).resize(1024,1024).webp({quality:90}).toFile('dist/assets/tee-ao.webp');
delete doc.images;delete doc.textures;delete doc.samplers;delete doc.extensionsUsed;delete doc.extensionsRequired;
const raw=Buffer.from(JSON.stringify(doc));
const json=Buffer.alloc(Math.ceil(raw.length/4)*4,0x20);raw.copy(json);
const result=Buffer.alloc(28+json.length+packed.length);
result.writeUInt32LE(0x46546c67,0);result.writeUInt32LE(2,4);result.writeUInt32LE(result.length,8);
result.writeUInt32LE(json.length,12);result.writeUInt32LE(0x4e4f534a,16);json.copy(result,20);
result.writeUInt32LE(packed.length,20+json.length);result.writeUInt32LE(0x004e4942,24+json.length);packed.copy(result,28+json.length);
await fs.writeFile('dist/assets/tee.glb',result);
console.log(JSON.stringify({bytes:result.length,vertices:position.length/3,triangles:indices.length/3,bounds:doc.accessors[0]}));
