// Chave pública (publishable): feita para o navegador; o acesso é limitado pelo RLS no banco.
export const SUPABASE_URL='https://bkyzkighkuswsssvicpy.supabase.co';
export const SUPABASE_KEY='sb_publishable_9rzjsC4wmHSmBxlKZfIwJg_SlDprprm';
const headers={apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`};
const USER_ERRORS=new Set(['22023','53400']);
export const online=()=>typeof fetch==='function'&&SUPABASE_URL.startsWith('https://');
async function handle(response){
 if(response.ok)return response.status===204?null:response.json();
 let message='Não foi possível falar com a loja agora. Tente de novo em instantes.';
 try{const error=await response.json();if(USER_ERRORS.has(error.code)&&typeof error.message==='string')message=error.message;}catch{}
 throw new Error(message);
}
export async function fetchProducts(){
 const fields='id,name,category,color,base,price_cents,tag,graphic,graphic_class,description,print,fabric,finish,fit,care';
 const rows=await handle(await fetch(`${SUPABASE_URL}/rest/v1/products?select=${fields}&active=eq.true&order=sort_order`,{headers}));
 return rows.map(p=>({id:p.id,name:p.name,category:p.category,color:p.color,base:p.base,price:p.price_cents,tag:p.tag,graphic:p.graphic,graphicClass:p.graphic_class,description:p.description,print:p.print,fabric:p.fabric,finish:p.finish,fit:p.fit,care:p.care}));
}
export async function rpc(name,args){
 return handle(await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(args)}));
}
export async function uploadDesign(path,blob){
 await handle(await fetch(`${SUPABASE_URL}/storage/v1/object/designs/${path}`,{method:'POST',headers:{...headers,'Content-Type':blob.type},body:blob}));
 return path;
}
export function dataURLToBlob(dataURL){
 const [meta,base64]=dataURL.split(','),type=meta.slice(5,meta.indexOf(';')),binary=atob(base64),bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 return new Blob([bytes],{type});
}
