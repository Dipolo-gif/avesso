export const SIZES=['P','M','G','GG'];
const CARE='Lavar do avesso, em água fria. Não usar alvejante. Secar à sombra.';
const AMERICANA_SPEC={fabric:'100% algodão fio 30.1 · 160 g/m²',finish:'Gola canelada alta de 3 cm; caimento reto e estruturado',fit:'Oversized americana: ombros marcados e corpo reto. Para um caimento mais justo, escolha um tamanho abaixo.',care:CARE};
const HEAVY_SPEC={fabric:'Suedine premium (algodão + poliamida) · 250 g/m²',finish:'Toque Pima, alta gramatura, menor encolhimento e caimento estável',fit:'Oversized heavy: encorpada e pesada, cai reto no corpo. Para menos volume, escolha um tamanho abaixo.',care:CARE};
export const PRODUCTS=[
 {id:'heavy-avesso',name:'Heavy · Do Avesso',category:'graphic',color:'Preto lavado',base:'black',swatch:'#26272a',price:15990,tag:'ESTAMPA AUTORAL',graphic:'DO SEU\nAVESSO.',graphicClass:'graphic-off',description:'Nossa peça mais encorpada — suedine 250 g — com uma estampa para vestir do seu avesso. O modelo também vem liso em preto, off-white e marrom.',print:'Serigrafia à base d’água, toque leve, resistente a lavagens',...HEAVY_SPEC},
 {id:'americana-sol',name:'Americana · Sol a Sol',category:'graphic',color:'Off white',base:'white',swatch:'#efece3',price:9990,tag:'COLEÇÃO 01',graphic:'SOL\nA SOL.',graphicClass:'graphic-sol',description:'Oversized americana de gola alta, leve (160 g) para o dia a dia e o treino, com azul intenso sobre off-white.',print:'Serigrafia à base d’água, toque leve, resistente a lavagens',...AMERICANA_SPEC},
 {id:'americana-off',name:'Oversized Americana',category:'essential',color:'Off white',base:'white',swatch:'#efece3',price:7990,tag:'TREINO',graphic:'',graphicClass:'',description:'Gola canelada alta, algodão 160 g e caimento reto e estruturado: a base para treinar e usar solta o dia inteiro. Também em preto e marrom.',print:'',...AMERICANA_SPEC},
 {id:'americana-marrom',name:'Oversized Americana',category:'essential',color:'Marrom',base:'brown',swatch:'#8a6a4f',price:7990,tag:'NOVA COR',graphic:'',graphicClass:'',description:'A americana de gola alta num marrom terroso. Leve (160 g), gola canelada de 3 cm e caimento reto. Também em preto e off-white.',print:'',...AMERICANA_SPEC},
 {id:'heavy-preta',name:'Oversized Heavy Suedine',category:'essential',color:'Preto lavado',base:'black',swatch:'#26272a',price:13990,tag:'PREMIUM',graphic:'',graphicClass:'',description:'Suedine premium 250 g, toque macio e caimento estável lavagem após lavagem. Nossa peça mais encorpada. Também em off-white e marrom.',print:'',...HEAVY_SPEC},
 {id:'heavy-marrom',name:'Oversized Heavy Suedine',category:'essential',color:'Marrom',base:'brown',swatch:'#8a6a4f',price:13990,tag:'PREMIUM',graphic:'',graphicClass:'',description:'A heavy suedine 250 g num marrom quente. Encorpada, macia e feita para durar. Também em preto e off-white.',print:'',...HEAVY_SPEC}
]
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
// Zonas da peça onde uma estampa pode ficar (rótulo em português para carrinho/pedido).
export const PRINT_ZONES={front:'frente',back:'costas','sleeve-left':'manga esquerda','sleeve-right':'manga direita',side:'lateral'};
export const PRINT_ZONE_AT={front:'na frente',back:'nas costas','sleeve-left':'na manga esquerda','sleeve-right':'na manga direita',side:'na lateral'};
export const isZone=z=>typeof z==='string'&&Object.hasOwn(PRINT_ZONES,z);
export const MAX_PRINTS=4;
const str=(v,max)=>typeof v==='string'?v.slice(0,max):'';
const num=(v,min,max,fallback)=>Number.isFinite(v)?Math.min(max,Math.max(min,v)):fallback;
function sanitizePlace(v){
 if(!v||typeof v!=='object'||!isZone(v.zone))return null;
 const vec=k=>Array.isArray(v[k])&&v[k].length===3&&v[k].every(x=>Number.isFinite(x)&&Math.abs(x)<=2)?v[k].map(x=>Math.round(x*1e4)/1e4):null;
 const p=vec('p'),n=vec('n');if(!p||!n)return null;
 return {p,n,zone:v.zone};
}
// Uma estampa: texto e/ou imagem, tamanho, rotação e lugar (sliders x/y na frente, ou place em qualquer zona).
// image_path nunca vem da sacola: só o checkout o cria, depois de subir a arte.
export function sanitizePrint(p){
 if(!p||typeof p!=='object')return null;
 return {text:str(p.text,70),font:['condensed','sans','serif'].includes(p.font)?p.font:'condensed',ink:/^#[0-9a-f]{6}$/i.test(p.ink)?p.ink:'#1737bc',scale:num(p.scale,45,100,80),x:num(p.x,-30,30,0),y:num(p.y,-25,25,0),rotation:num(p.rotation,-15,15,0),place:sanitizePlace(p.place),image:validImageURL(p.image)?p.image:null};
}
export function sanitizeDesign(d){
 if(!d||typeof d!=='object')return null;
 const mode=d.mode==='brief'?'brief':'create';
 const base={mode,color:['white','black'].includes(d.color)?d.color:'white',garment:/^#[0-9a-f]{6}$/i.test(d.garment)?d.garment.toLowerCase():'',size:SIZES.includes(d.size)?d.size:'M'};
 if(mode==='brief')return {...base,brief:str(d.brief,400)};
 // Pedidos/sacolas antigos guardavam uma estampa só nos campos de cima; viram uma lista de 1.
 const list=(Array.isArray(d.prints)?d.prints:[d]).slice(0,MAX_PRINTS).map(sanitizePrint).filter(Boolean);
 return {...base,prints:list.length?list:[sanitizePrint({})]};
}
export const printZone=p=>isZone(p?.place?.zone)?p.place.zone:'front';
export const printZoneLabel=p=>PRINT_ZONES[printZone(p)];
export function printsSummary(design){
 const prints=design?.prints||[];
 if(prints.length<=1)return `Estampa ${PRINT_ZONE_AT[printZone(prints[0])]}`;
 return `${prints.length} estampas: ${prints.map(printZoneLabel).join(', ')}`;
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
