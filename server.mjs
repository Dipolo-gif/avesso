import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.glb':'model/gltf-binary','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8'};
const CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self' https://bkyzkighkuswsssvicpy.supabase.co https://viacep.com.br https://servicodados.ibge.gov.br; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
const headers={'Content-Security-Policy':CSP,'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'strict-origin-when-cross-origin','Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=(), usb=()','Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Resource-Policy':'same-origin','Cache-Control':'no-cache'};
http.createServer(async(req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{...headers,Allow:'GET, HEAD'});res.end();return;}
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403,headers);res.end();return;}
  const content=await readFile(file);
  res.writeHead(200,{...headers,'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':content.length});
  res.end(req.method==='HEAD'?undefined:content);
 }catch{res.writeHead(404,{...headers,'Content-Type':'text/plain; charset=utf-8'});res.end('Arquivo não encontrado');}
}).listen(5174,'127.0.0.1',()=>console.log('DOAVESSO preview: http://127.0.0.1:5174'));
