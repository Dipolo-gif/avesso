import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const api=(await readFile(new URL('../dist/api.js',import.meta.url),'utf8')).replaceAll('export ','');
test('rebrand migrates legacy data once and never resurrects signed-out tokens',()=>{
 const dom=new JSDOM('',{url:'https://duavesso.vercel.app/',runScripts:'outside-only'}),w=dom.window;
 try{
  const old={access_token:'test-token',refresh_token:'test-refresh',user:{id:'test-user'}};
  w.localStorage.setItem('doavesso.session.v1',JSON.stringify(old));
  w.localStorage.setItem('doavesso.cart.v1','[{"id":"kept"}]');
  w.localStorage.setItem('doavesso.pkce.v1','test-verifier');
  w.eval(api);
  assert.equal(w.localStorage.getItem('duavesso.session.v1'),JSON.stringify(old));
  assert.equal(w.localStorage.getItem('duavesso.cart.v1'),'[{"id":"kept"}]');
  assert.equal(w.localStorage.getItem('duavesso.pkce.v1'),'test-verifier');
  assert.equal(w.localStorage.getItem('doavesso.session.v1'),null);
  w.localStorage.removeItem('duavesso.session.v1');w.eval(api);
  assert.equal(w.localStorage.getItem('duavesso.session.v1'),null);
 }finally{w.close();}
});
test('rebrand keeps new data when both namespaces exist',()=>{
 const dom=new JSDOM('',{url:'https://duavesso.vercel.app/',runScripts:'outside-only'}),w=dom.window;
 try{w.localStorage.setItem('doavesso.cart.v1','old');w.localStorage.setItem('duavesso.cart.v1','new');w.eval(api);assert.equal(w.localStorage.getItem('duavesso.cart.v1'),'new');assert.equal(w.localStorage.getItem('doavesso.cart.v1'),null);}finally{w.close();}
});
