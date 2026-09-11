import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
const commerce=(await readFile(new URL('../dist/commerce.js',import.meta.url),'utf8')).replaceAll('export ','');
const app=(await readFile(new URL('../dist/app.js',import.meta.url),'utf8')).replace(/^import .*?;\n/,'');
async function setup(storage={}){
 const dom=new JSDOM(html,{url:'http://localhost/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;
 w.scrollTo=()=>{};w.matchMedia=()=>({matches:true});w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 Object.defineProperty(w.document,'fonts',{value:{ready:Promise.resolve()}});
 w.Image=class {width=1000;height=1000;set src(value){this._src=value;queueMicrotask(()=>this.onload?.());}get src(){return this._src;}};
 w.HTMLCanvasElement.prototype.getContext=()=>({clearRect(){},drawImage(){},save(){},translate(){},rotate(){},scale(){},beginPath(){},rect(){},clip(){},measureText(t){return {width:t.length*45};},fillText(){},restore(){},setLineDash(){},strokeRect(){},fillRect(){}});
 w.HTMLCanvasElement.prototype.toDataURL=()=> 'data:image/jpeg;base64,AA==';
 w.HTMLCanvasElement.prototype.toBlob=function(cb){cb(new w.Blob(['test'],{type:'image/png'}));};
 for(const [key,value] of Object.entries(storage))w.localStorage.setItem(key,JSON.stringify(value));
 const registry=new Map();
 Object.defineProperty(w.document,'modelContext',{value:{registerTool(tool){registry.set(tool.name,tool);}}});
 w.eval(commerce+'\nconst esc=escapeHTML;\n'+app);
 await new Promise(resolve=>setTimeout(resolve,10));
 return {dom,w,doc:w.document,registry,click(selector){const e=w.document.querySelector(selector);assert(e,`Missing ${selector}`);e.click();},close(){dom.window.close();}};
}
test('catalog filters and product selection feed the same persisted cart',async()=>{
 const s=await setup();try{
 assert.equal(s.doc.querySelectorAll('.product-card').length,4);
 s.click('[data-filter="essential"]');assert.equal(s.doc.querySelectorAll('.product-card').length,2);
 s.click('[data-product="essencial-preta"]');assert(s.doc.querySelector('#product-dialog').open);
 assert(s.doc.querySelector('#add-product').disabled);
 s.click('[data-size="G"]');s.click('#add-product');
 assert(s.doc.querySelector('#cart-dialog').open);assert.equal(s.doc.querySelector('#cart-count').textContent,'1');
 const stored=JSON.parse(s.w.localStorage.getItem('avesso.cart.v1'));assert.equal(stored[0].size,'G');assert.equal(stored[0].price,8990);
 s.click('[data-qty="1"]');assert.equal(s.doc.querySelector('#cart-count').textContent,'2');
 s.click('[data-remove]');assert.equal(s.doc.querySelector('#cart-count').textContent,'0');assert(s.doc.querySelector('#continue-shopping'));
 }finally{s.close();}
});
test('checkout confirms a simulated order and never persists contact or address',async()=>{
 const s=await setup();try{
 s.click('[data-product="off-line"]');s.click('[data-size="M"]');s.click('#add-product');s.click('#begin-checkout');s.click('#fill-demo');
 const form=s.doc.querySelector('#checkout-form');assert(form.checkValidity());
 const express=s.doc.querySelector('[value="express"]');express.checked=true;express.dispatchEvent(new s.w.Event('change',{bubbles:true}));
 form.dispatchEvent(new s.w.Event('submit',{bubbles:true,cancelable:true}));
 assert(s.doc.querySelector('#finish-order'));assert.equal(s.doc.querySelector('#cart-count').textContent,'0');
 const raw=s.w.localStorage.getItem('avesso.orders.v1'),order=JSON.parse(raw)[0];assert.equal(order.total,13480);assert.equal(order.shipping,'express');assert.equal(order.items[0].size,'M');assert(!raw.includes('cliente@example.com'));assert(!raw.includes('Rua de Exemplo'));assert(!raw.includes('Cliente de Exemplo'));
 s.click('#finish-order');s.click('#view-orders');assert(s.doc.querySelector('#info-content').textContent.includes(order.id));
 }finally{s.close();}
});
test('customized variant includes snapshot and survives cart reload',async()=>{
 const s=await setup();let saved;try{
 s.w.location.hash='estudio';await new Promise(r=>setTimeout(r,10));assert.equal(s.doc.querySelector('#studio-view').hidden,false);
 s.doc.querySelector('#design-text').value='MINHA IDEIA';s.doc.querySelector('#design-size').value='GG';
 s.doc.querySelector('#design-form').dispatchEvent(new s.w.Event('submit',{bubbles:true,cancelable:true}));await new Promise(r=>setTimeout(r,10));
 saved=JSON.parse(s.w.localStorage.getItem('avesso.cart.v1'));assert.equal(saved[0].size,'GG');assert.equal(saved[0].design.text,'MINHA IDEIA');assert(saved[0].preview.startsWith('data:image/jpeg'));assert.equal(saved[0].price,12990);
 }finally{s.close();}
 const r=await setup({'avesso.cart.v1':saved});try{r.click('#open-cart');assert.equal(r.doc.querySelector('#cart-count').textContent,'1');assert(r.doc.querySelector('.cart-thumb img').src.startsWith('data:image/jpeg'));}finally{r.close();}
});
test('described print requires a brief, prices the design service and keeps the brief through reload',async()=>{
 const s=await setup();let saved;try{
 s.w.location.hash='estudio';await new Promise(r=>setTimeout(r,10));
 s.click('[data-mode="brief"]');assert.equal(s.doc.querySelector('#brief-fields').hidden,false);assert.equal(s.doc.querySelector('#create-fields').hidden,true);assert.equal(s.doc.querySelector('#custom-price').textContent,'R$ 149,90'.replace(' ',' '));
 const submit=()=>{s.doc.querySelector('#design-form').dispatchEvent(new s.w.Event('submit',{bubbles:true,cancelable:true}));return new Promise(r=>setTimeout(r,10));};
 s.doc.querySelector('#design-brief').value='curta';await submit();assert.equal(s.w.localStorage.getItem('avesso.cart.v1'),null);
 s.doc.querySelector('#design-brief').value='Uma onda azul minimalista no peito com a frase sem pressa';s.doc.querySelector('#design-color').value='black';await submit();
 saved=JSON.parse(s.w.localStorage.getItem('avesso.cart.v1'));assert.equal(saved[0].price,14990);assert.equal(saved[0].design.mode,'brief');assert(saved[0].design.brief.includes('onda azul'));assert.equal(saved[0].design.image,undefined);
 assert(s.doc.querySelector('#cart-content').textContent.includes('onda azul'));
 s.click('#reset-design');assert.equal(s.doc.querySelector('#brief-fields').hidden,true);assert.equal(s.doc.querySelector('#custom-price').textContent,'R$ 129,90'.replace(' ',' '));
 }finally{s.close();}
 const r=await setup({'avesso.cart.v1':saved});try{r.click('#open-cart');assert.equal(r.doc.querySelector('.cart-item h3').textContent,'Sua camiseta · Estampa sob medida');assert(r.doc.querySelector('.brief-excerpt').textContent.includes('onda azul'));}finally{r.close();}
});
test('imperative tools register with schemas and reject invalid writes without changing cart',async()=>{
 const s=await setup();try{
 assert.equal(s.registry.size,2);const read=s.registry.get('read_avesso_catalog_and_cart'),add=s.registry.get('add_avesso_catalog_item_to_cart');
 assert.equal(read.annotations.readOnlyHint,true);assert.equal(add.inputSchema.required.length,2);
 assert.equal(read.execute({}).totals.count,0);assert.throws(()=>add.execute({productId:'off-line',size:'INVALID'}),/válidos/);assert.equal(read.execute({}).totals.count,0);
 const result=add.execute({productId:'off-line',size:'M'});assert.equal(result.added,true);assert.equal(read.execute({}).totals.count,1);assert.equal(s.doc.querySelector('#cart-count').textContent,'1');assert(s.doc.querySelector('#cart-dialog').open);
 }finally{s.close();}
});
