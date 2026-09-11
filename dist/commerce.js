export const SIZES=['P','M','G','GG'];
export const PRODUCTS=[
 {id:'off-line',name:'Oversized Off Line',category:'graphic',color:'Preto lavado',base:'black',price:10990,tag:'ESTAMPA AUTORAL',graphic:'OFF\nLINE.',graphicClass:'graphic-off',description:'Uma pausa no automático. Modelagem ampla, preto lavado e uma estampa para sair da linha.'},
 {id:'sol-sol',name:'Oversized Sol a Sol',category:'graphic',color:'Branco giz',base:'white',price:10990,tag:'COLEÇÃO 01',graphic:'SOL\nA SOL.',graphicClass:'graphic-sol',description:'Azul intenso sobre branco giz. Um pouco de sol para levar com você, de segunda a domingo.'},
 {id:'essencial-preta',name:'Essencial Preta',category:'essential',color:'Preto lavado',base:'black',price:8990,tag:'SEM ESTAMPA',graphic:'',graphicClass:'',description:'Aquela camiseta que combina com o dia inteiro. Caimento amplo e uma base fácil de repetir.'},
 {id:'essencial-branca',name:'Essencial Branca',category:'essential',color:'Branco giz',base:'white',price:8990,tag:'SEM ESTAMPA',graphic:'',graphicClass:'',description:'Sua tela em branco. Silhueta oversized e visual limpo para combinar do seu jeito.'}
];
export const money=cents=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function totals(items,shipping='standard'){
 const subtotal=items.reduce((sum,item)=>sum+item.price*item.qty,0);
 const delivery=items.length?(shipping==='express'?2490:subtotal>=25000?0:1490):0;
 return {subtotal,delivery,total:subtotal+delivery,count:items.reduce((sum,item)=>sum+item.qty,0)};
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
export function normalizeCart(value){
 if(!Array.isArray(value))return [];
 return value.slice(0,30).flatMap(x=>{
  if(!x||!SIZES.includes(x.size)||!Number.isInteger(x.qty)||x.qty<1||x.qty>10)return [];
  const p=PRODUCTS.find(p=>p.id===x.id);
  if(p)return [{...p,key:`${p.id}-${x.size}`,size:x.size,qty:x.qty}];
  if(x.id==='custom'&&typeof x.key==='string'&&/^custom-[\w-]+$/.test(x.key)&&['white','black'].includes(x.base)&&validImageURL(x.preview))return [{id:'custom',key:x.key,name:'Sua camiseta · Studio',category:'custom',base:x.base,color:x.base==='white'?'Branco giz':'Preto lavado',size:x.size,qty:x.qty,price:12990,preview:x.preview,design:x.design&&typeof x.design==='object'?x.design:null}];
  return [];
 });
}
