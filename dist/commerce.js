export const SIZES=['P','M','G','GG'];
const SPECS={fabric:'100% algodão penteado · 210 g/m²',finish:'Lavagem enzimática, toque macio desde o primeiro uso',fit:'Modelagem oversized: ombro caído e corpo amplo. Para um caimento menos largo, escolha um tamanho abaixo do habitual.',care:'Lavar do avesso, em água fria. Não usar alvejante. Secar à sombra.'};
export const PRODUCTS=[
 {id:'off-line',name:'Oversized Off Line',category:'graphic',color:'Preto lavado',base:'black',price:10990,tag:'ESTAMPA AUTORAL',graphic:'OFF\nLINE.',graphicClass:'graphic-off',description:'Uma pausa no automático. Modelagem ampla, preto lavado e uma estampa para sair da linha.',print:'Serigrafia à base d’água, toque leve, resistente a lavagens',...SPECS},
 {id:'sol-sol',name:'Oversized Sol a Sol',category:'graphic',color:'Branco giz',base:'white',price:10990,tag:'COLEÇÃO 01',graphic:'SOL\nA SOL.',graphicClass:'graphic-sol',description:'Azul intenso sobre branco giz. Um pouco de sol para levar com você, de segunda a domingo.',print:'Serigrafia à base d’água, toque leve, resistente a lavagens',...SPECS},
 {id:'essencial-preta',name:'Essencial Preta',category:'essential',color:'Preto lavado',base:'black',price:8990,tag:'BÁSICA',graphic:'',graphicClass:'',description:'Aquela camiseta que combina com o dia inteiro. Caimento amplo e uma base fácil de repetir.',print:'',...SPECS},
 {id:'essencial-branca',name:'Essencial Branca',category:'essential',color:'Branco giz',base:'white',price:8990,tag:'BÁSICA',graphic:'',graphicClass:'',description:'Sua tela em branco. Silhueta oversized e visual limpo para combinar do seu jeito.',print:'',...SPECS}
];
export function setProducts(list){PRODUCTS.splice(0,PRODUCTS.length,...list);}
export const INSTALLMENTS=3;
export const installment=cents=>Math.ceil(cents/INSTALLMENTS);
export const CUSTOM={create:{name:'Sua camiseta · Studio',price:12990},brief:{name:'Sua camiseta · Estampa sob medida',price:14990}};
export const customMode=design=>design?.mode==='brief'?'brief':'create';
// Rótulo da cor no carrinho/pedido: base do catálogo ou a cor livre escolhida no estúdio 3D.
export const garmentLabel=design=>design?.garment?`Cor personalizada ${design.garment}`:design?.color==='black'?'Preto lavado':'Branco giz';
export const money=cents=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const FREE_SHIPPING_MIN=25000;
export function totals(items,shipping='standard'){
 const subtotal=items.reduce((sum,item)=>sum+item.price*item.qty,0);
 const delivery=items.length?(shipping==='express'?2490:subtotal>=FREE_SHIPPING_MIN?0:1490):0;
 return {subtotal,delivery,total:subtotal+delivery,count:items.reduce((sum,item)=>sum+item.qty,0)};
}
export function shippingSuggestion(items){
 const remaining=FREE_SHIPPING_MIN-items.reduce((sum,item)=>sum+item.price*item.qty,0);
 if(remaining<=0)return null;
 const inCart=new Set(items.map(i=>i.id)),candidates=[...PRODUCTS].sort((a,b)=>a.price-b.price);
 return candidates.find(p=>p.price>=remaining&&!inCart.has(p.id))||candidates.find(p=>p.price>=remaining)||candidates.at(-1);
}
export function addItem(items,item){
 if(!SIZES.includes(item.size)||!Number.isInteger(item.price)||item.price<=0)throw new Error('Produto ou tamanho inválido.');
 const existing=items.find(x=>x.key===item.key);
 if(existing?.qty>=10)throw new Error('Limite de 10 unidades por modelo e tamanho.');
 if(items.length>=30&&!existing)throw new Error('Limite de 30 itens diferentes na sacola.');
 return existing?items.map(x=>x.key===item.key?{...x,qty:x.qty+1}:x):[...items,{...item,qty:1}];
}
export function changeQuantity(items,key,delta){
 if(![1,-1].includes(delta))throw new Error('Quantidade inválida.');
 return items.map(x=>x.key===key?{...x,qty:Math.min(10,x.qty+delta)}:x).filter(x=>x.qty>0);
}
export function validImageURL(value){return typeof value==='string'&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)&&value.length<1500000;}
export function sanitizeDesign(d){
 if(!d||typeof d!=='object')return null;
 const mode=d.mode==='brief'?'brief':'create';
 const str=(v,max)=>typeof v==='string'?v.slice(0,max):'';
 const num=(v,min,max,fallback)=>Number.isFinite(v)?Math.min(max,Math.max(min,v)):fallback;
 const base={mode,color:['white','black'].includes(d.color)?d.color:'white',garment:/^#[0-9a-f]{6}$/i.test(d.garment)?d.garment.toLowerCase():'',size:SIZES.includes(d.size)?d.size:'M',scale:num(d.scale,45,100,80),x:num(d.x,-30,30,0),y:num(d.y,-25,25,0),rotation:num(d.rotation,-15,15,0)};
 if(mode==='brief')return {...base,brief:str(d.brief,400)};
 return {...base,text:str(d.text,70),font:['condensed','sans','serif'].includes(d.font)?d.font:'condensed',ink:/^#[0-9a-f]{6}$/i.test(d.ink)?d.ink:'#1737bc',image:validImageURL(d.image)?d.image:null};
}
export function normalizeCart(value){
 if(!Array.isArray(value))return [];
 return value.slice(0,30).flatMap(x=>{
  if(!x||!SIZES.includes(x.size)||!Number.isInteger(x.qty)||x.qty<1||x.qty>10)return [];
  const p=PRODUCTS.find(p=>p.id===x.id);
  if(p)return [{...p,key:`${p.id}-${x.size}`,size:x.size,qty:x.qty}];
  if(x.id==='custom'&&typeof x.key==='string'&&/^custom-[\w-]+$/.test(x.key)&&['white','black'].includes(x.base)&&validImageURL(x.preview)){const design=sanitizeDesign(x.design),mode=customMode(design);return [{id:'custom',key:x.key,name:CUSTOM[mode].name,category:'custom',base:x.base,color:garmentLabel({...design,color:x.base}),size:x.size,qty:x.qty,price:CUSTOM[mode].price,preview:x.preview,design}];}
  return [];
 });
}
