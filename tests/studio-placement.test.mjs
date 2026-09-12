import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CHEST_Y,UNIT,printUV,dragPosition} from '../dist/studio-placement.js';
import {sanitizeDesign} from '../dist/commerce.js';
const close=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
test('print center stays anchored under scale, position and rotation',()=>{
 for(const rotation of [-15,0,15])for(const scale of [45,80,100]){
  const d={x:21,y:-18,rotation,scale},center={x:d.x*UNIT,y:CHEST_Y-d.y*UNIT};
  const uv=printUV(center,d);close(uv.x,.5);close(uv.y,.5);
  const theta=-rotation*Math.PI/180;
  const edge=printUV({x:center.x+Math.cos(theta)*.15*scale/100,y:center.y+Math.sin(theta)*.15*scale/100},d);
  close(edge.x,1);close(edge.y,.5);
 }
});
test('grabbing an off-center point does not jump; pointer positions respect limits',()=>{
 const offset={x:.03,y:-.02},point={x:10*UNIT+offset.x,y:CHEST_Y-5*UNIT+offset.y};
 assert.deepEqual(dragPosition(point,offset),{x:10,y:5});
 assert.deepEqual(dragPosition({x:point.x+2*UNIT,y:point.y-3*UNIT},offset),{x:12,y:8});
 assert.deepEqual(dragPosition({x:20,y:-20},offset),{x:30,y:25});
});
test('custom garment color and print placement survive persistence without executable values',()=>{
 const d=sanitizeDesign({garment:'#Aa33FF',x:19,y:22,rotation:-10,scale:67,text:'Minha camiseta'});
 assert.equal(d.garment,'#aa33ff');assert.equal(d.x,19);assert.equal(d.y,22);
 assert.deepEqual(sanitizeDesign(d),d);
 assert.equal(sanitizeDesign({garment:'url(javascript:alert(1))'}).garment,'');
});
test('shipping GLB is a textured-UV garment, not an external-resource scene',async()=>{
 const bytes=await readFile(new URL('../dist/assets/tee.glb',import.meta.url));
 assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(8),bytes.length);
 const doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
 assert.equal(doc.nodes[0].name,'Tee');assert.equal(doc.meshes.length,1);
 const mesh=doc.meshes[0].primitives[0];assert.notEqual(mesh.attributes.TEXCOORD_0,undefined);
 assert(doc.accessors[mesh.indices].count/3<25000);assert.equal(doc.images,undefined);
 assert.equal(doc.cameras,undefined);assert(doc.asset.copyright.includes('Poimandres'));
});
