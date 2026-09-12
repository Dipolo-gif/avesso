import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CHEST_Y,UNIT,printUV,dragPosition,printFrame,frameUV,projectorMatrix,frontPlace,sliderPosition,zoneOf,dragPlace} from '../dist/studio-placement.js';
import {sanitizeDesign,sanitizePrint,printsSummary,MAX_PRINTS} from '../dist/commerce.js';
const close=(a,b,eps=1e-6)=>assert(Math.abs(a-b)<eps,`${a} != ${b}`);
const apply=(m,p)=>[0,1,2].map(r=>m[r]*p[0]+m[4+r]*p[1]+m[8+r]*p[2]+m[12+r]);
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
test('surface frame matches the legacy front mapping and keeps text upright on every side',()=>{
 for(const rotation of [-15,0,15])for(const scale of [45,80,100]){
  const d={x:12,y:-7,rotation,scale},frame=printFrame(frontPlace(d),d);
  for(const [px,py] of [[.02,.05],[-.11,-.1],[0,0]]){
   const legacy=printUV({x:px,y:py},d),uv=frameUV(frame,[px,py,0]);
   close(uv.x,legacy.x);close(uv.y,legacy.y);
   const q=apply(projectorMatrix(frame,.09),[px,py,.05]);close(q[0],legacy.x);close(q[1],legacy.y);close(q[2],.05/.09);
  }
 }
 // costas: "cima" continua para cima e a leitura não fica espelhada vista de trás (x local = -x mundo)
 const back=printFrame({p:[0,.44,-.12],n:[0,0,-1]},{scale:80,rotation:0});
 assert.deepEqual(back.up.map(v=>+v.toFixed(6)),[0,1,0]);assert.deepEqual(back.right.map(v=>+v.toFixed(6)),[-1,0,0]);
 // manga esquerda (+x): normal para fora, "cima" para cima
 const sleeve=printFrame({p:[.3,.5,0],n:[1,0,0]},{scale:60,rotation:0});
 assert.deepEqual(sleeve.up.map(v=>+v.toFixed(6)),[0,1,0]);close(sleeve.w,.18);close(sleeve.h,.198);
 // normal quase vertical (barra): sem divisão por zero
 const flat=printFrame({p:[0,.1,0],n:[0,1,0]},{scale:80,rotation:0});
 assert(Number.isFinite(flat.right[0]) && Number.isFinite(flat.up[2]));
});
test('dragging keeps the grabbed point under the pointer and classifies zones',()=>{
 const d={scale:80,rotation:10},grab={u:.2,v:-.3},hitPoint=[.05,.4,.1],normal=[0,0,1];
 const place=dragPlace(hitPoint,normal,grab,d,.35),frame=printFrame(place,d),uv=frameUV(frame,hitPoint);
 close(uv.x,.5+grab.u);close(uv.y,.5+grab.v);assert.equal(place.zone,'front');
 assert.equal(zoneOf([0,.4,-.1],[0,0,-1],.35),'back');
 assert.equal(zoneOf([.3,.5,0],[1,0,0],.35),'sleeve-left');
 assert.equal(zoneOf([-.3,.5,0],[-1,0,0],.35),'sleeve-right');
 assert.equal(zoneOf([.2,.2,0],[.9,0,.1],.35),'side');
 assert.deepEqual(sliderPosition({p:[10*UNIT,CHEST_Y-4*UNIT,.06],n:[0,0,1],zone:'front'}),{x:10,y:4});
 assert.equal(sliderPosition({p:[40*UNIT,CHEST_Y,.06],n:[0,0,1],zone:'front'}),null);
 assert.equal(sliderPosition({p:[0,.4,-.12],n:[0,0,-1],zone:'back'}),null);
});
test('custom garment color and print placement survive persistence without executable values',()=>{
 const d=sanitizeDesign({garment:'#Aa33FF',x:19,y:22,rotation:-10,scale:67,text:'Minha camiseta'});
 assert.equal(d.garment,'#aa33ff');assert.equal(d.prints.length,1);assert.equal(d.prints[0].x,19);assert.equal(d.prints[0].y,22);
 assert.deepEqual(sanitizeDesign(d),d);
 assert.equal(sanitizeDesign({garment:'url(javascript:alert(1))'}).garment,'');
});
test('several prints keep their places; invalid places, extra prints and bad paths are dropped',()=>{
 const back={p:[0,.4,-.12],n:[0,0,-1],zone:'back'};
 const d=sanitizeDesign({prints:[{text:'A'},{text:'B',place:back,image_path:'123e4567-e89b-12d3-a456-426614174000/art.webp'},{text:'C',place:{p:[9,0,0],n:[0,0,1],zone:'front'}},{text:'D',place:{p:[0,0,0],n:[0,0,1],zone:'roof'}},{text:'E'}]});
 assert.equal(d.prints.length,MAX_PRINTS);
 assert.deepEqual(d.prints[1].place,back);assert.equal(d.prints[1].image_path,undefined,'image_path só nasce no checkout, nunca da sacola');
 assert.equal(d.prints[2].place,null);assert.equal(d.prints[3].place,null);
 assert.equal(sanitizePrint({image_path:'123e4567-e89b-12d3-a456-426614174000/art.webp'}).image_path,undefined);
 for(const zone of ['constructor','__proto__','toString','roof'])assert.equal(sanitizePrint({place:{p:[0,0,0],n:[0,0,1],zone}}).place,null,`zona ${zone} não é válida`);
 assert.equal(printsSummary(d),'4 estampas: frente, costas, frente, frente');
 assert.equal(printsSummary(sanitizeDesign({text:'só uma'})),'Estampa na frente');
 assert.equal(printsSummary(sanitizeDesign({prints:[{text:'x',place:back}]})),'Estampa nas costas');
 assert.deepEqual(sanitizeDesign(d),d);
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
