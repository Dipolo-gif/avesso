import {PRODUCTS,SIZES,CUSTOM,FREE_SHIPPING_MIN,INSTALLMENTS,installment,customMode,shippingSuggestion,setProducts,money,escapeHTML as esc,totals,addItem,changeQuantity,normalizeCart,validImageURL,garmentLabel} from './commerce.js';
import {online,fetchProducts,rpc,uploadDesign,dataURLToBlob,getUser,signIn,signUp,signOut,resetPassword,updatePassword,signInWithGoogle,handleAuthRedirect,fetchProfile,updateProfile,fetchMyOrders} from './api.js';
const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
let filter='all';
function graphicHTML(p){return p.graphic?`<span class="product-graphic ${p.graphicClass}">${esc(p.graphic)}</span>`:'';}
const TEE_WIDTHS=[400,800,1254];
function teePicture(base,alt,sizes,attrs=''){return `<picture><source type="image/webp" srcset="${TEE_WIDTHS.map(w=>`assets/tee-${base}-${w}.webp ${w}w`).join(', ')}" sizes="${sizes}"><img src="assets/tee-${base}-1254.jpg" alt="${alt}" width="1254" height="1254" decoding="async" ${attrs}></picture>`;}
function renderCatalog(){
 const query=$('#search').value.trim().toLocaleLowerCase('pt-BR');
 let products=PRODUCTS.filter(p=>(filter==='all'||p.category===filter)&&`${p.name} ${p.color}`.toLocaleLowerCase('pt-BR').includes(query));
 if($('#sort').value==='price-low')products.sort((a,b)=>a.price-b.price);
 if($('#sort').value==='price-high')products.sort((a,b)=>b.price-a.price);
 $('#product-grid').innerHTML=products.map((p,i)=>`<article class="product-card"><button class="product-image-button" data-product="${p.id}"><span class="sr-only">Ver ${p.name}: </span><div class="product-visual">${teePicture(p.base,`${p.name}, ${p.color}`,'(max-width:700px) 48vw, 24vw','loading="lazy"')}${graphicHTML(p)}</div><span class="product-tag">${p.tag}</span><span class="product-add" aria-hidden="true">＋</span></button><div class="product-meta"><h3><a href="#produto-${p.id}">${p.name}</a></h3><span class="price">${money(p.price)}</span></div><p class="installments">${INSTALLMENTS}x de ${money(installment(p.price))} sem juros</p><div class="product-sub"><span><i class="color-dot" style="background:${p.base==='black'?'#28292b':'#fafafa'}"></i>${p.color}</span><span>P — GG</span></div></article>`).join('');
 $('#product-count').textContent=`${products.length} ${products.length===1?'peça':'peças'} / coleção 01`;
 $('#empty-search').hidden=products.length>0;
}
renderCatalog();
if(online())fetchProducts().then(list=>{if(list.length){setProducts(list);renderCatalog();cart=normalizeCart(cart);updateCartCount();}}).catch(()=>{});

const CART_KEY='doavesso.cart.v1',ORDERS_KEY='doavesso.orders.v1';
function readStored(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
let cart=normalizeCart(readStored(CART_KEY,[]));
let orders=readStored(ORDERS_KEY,[]);
if(!Array.isArray(orders))orders=[];
orders=orders.filter(o=>o&&typeof o.id==='string'&&Array.isArray(o.items)&&Number.isFinite(o.total)).slice(0,20);
let toastTimer;
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),4200);}
function saveCart(){try{localStorage.setItem(CART_KEY,JSON.stringify(cart));}catch{toast('Sacola atualizada nesta sessão. O navegador não permitiu salvá-la.');}updateCartCount();}
function updateCartCount(){const count=totals(cart).count;$('#cart-count').textContent=count;$('#open-cart').setAttribute('aria-label',`Abrir sacola, ${count} ${count===1?'peça':'peças'}`);}
function openDialog(id){const d=$(id);if(!d.open)d.showModal();}
function closeDialog(dialog){dialog.close();}
$$('dialog').forEach(d=>{
 $('.close-dialog',d).addEventListener('click',()=>closeDialog(d));
 d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(d);}});
});
$('.mobile-menu-toggle').addEventListener('click',()=>{const menu=$('#mobile-menu');menu.hidden=!menu.hidden;$('.mobile-menu-toggle').setAttribute('aria-expanded',String(!menu.hidden));});
$$('#mobile-menu a').forEach(a=>a.addEventListener('click',()=>{$('#mobile-menu').hidden=true;$('.mobile-menu-toggle').setAttribute('aria-expanded','false');}));
$$('[data-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;$$('[data-filter]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});renderCatalog();}));
$('#sort').addEventListener('change',renderCatalog);
$('#search').addEventListener('input',renderCatalog);
$('#clear-search').addEventListener('click',()=>{$('#search').value='';renderCatalog();$('#search').focus();});
$('.search-toggle').addEventListener('click',()=>{$('.search-row').hidden=false;location.hash='colecao';setTimeout(()=>$('#search').focus(),100);});

function showProduct(id){
 const p=PRODUCTS.find(p=>p.id===id);if(!p)return;
 $('#product-detail').innerHTML=`<div class="detail-layout"><div class="detail-visual"><div class="product-visual">${teePicture(p.base,p.name,'(max-width:700px) 94vw, 450px')}${graphicHTML(p)}</div></div><div class="detail-copy"><span class="eyebrow">DOAVESSO / ${p.category==='graphic'?'ESTAMPADAS':'ESSENCIAIS'}</span><h2>${p.name}</h2><div class="price">${money(p.price)}</div><p class="installments">ou ${INSTALLMENTS}x de ${money(installment(p.price))} sem juros</p><p>${p.description}</p><p><i class="color-dot" style="background:${p.base==='black'?'#28292b':'#fafafa'}"></i> ${p.color}</p><span style="font-size:14px">Escolha seu tamanho</span><div class="size-options" role="group" aria-label="Tamanho da camiseta">${SIZES.map(s=>`<button data-size="${s}" aria-pressed="false">${s}</button>`).join('')}</div><button class="text-link size-guide-button">Guia de medidas ↗</button><button class="button button-blue" id="add-product" disabled>Selecione um tamanho <span>＋</span></button><ul class="trust-row"><li>Frete grátis a partir de ${money(FREE_SHIPPING_MIN)}</li><li>Troca fácil em 30 dias</li><li>Pix ou cartão em até ${INSTALLMENTS}x</li></ul><dl class="specs"><div><dt>Tecido</dt><dd>${p.fabric}</dd></div><div><dt>Acabamento</dt><dd>${p.finish}</dd></div>${p.print?`<div><dt>Estampa</dt><dd>${p.print}</dd></div>`:''}<div><dt>Caimento</dt><dd>${p.fit}</dd></div><div><dt>Cuidados</dt><dd>${p.care}</dd></div></dl><p class="helper">Imagem, preço e características para demonstração.</p></div></div>`;
 let selected='';
 $$('[data-size]',$('#product-detail')).forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.size;$$('[data-size]',$('#product-detail')).forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('#add-product').disabled=false;$('#add-product').innerHTML='Adicionar à sacola <span>＋</span>';}));
 $('#add-product').addEventListener('click',()=>{if(addCatalogItem(p.id,selected)){closeDialog($('#product-dialog'));showCart();}});
 $('.size-guide-button',$('#product-detail')).addEventListener('click',showSizeGuide);
 openDialog('#product-dialog');
}
function addCatalogItem(id,size){
 const p=PRODUCTS.find(x=>x.id===id);if(!p||!SIZES.includes(size))throw new Error('Escolha um produto e um tamanho válidos.');
 try{cart=addItem(cart,{...p,size,key:`${p.id}-${size}`});saveCart();return true;}catch(e){toast(e.message);return false;}
}
$('#product-grid').addEventListener('click',e=>{const b=e.target.closest('[data-product]');if(b)showProduct(b.dataset.product);});
function showSizeGuide(){showInfo('Guia de medidas',`<p>Medidas da peça estendida, em centímetros. Compare com uma camiseta que você já gosta de vestir.</p><table><thead><tr><th scope="col">Tamanho</th><th scope="col">Largura</th><th scope="col">Comprimento</th></tr></thead><tbody><tr><th scope="row">P</th><td>54 cm</td><td>70 cm</td></tr><tr><th scope="row">M</th><td>57 cm</td><td>73 cm</td></tr><tr><th scope="row">G</th><td>60 cm</td><td>76 cm</td></tr><tr><th scope="row">GG</th><td>63 cm</td><td>79 cm</td></tr></tbody></table><p style="margin-top:20px">Tabela demonstrativa. As medidas finais devem ser conferidas com o fornecedor antes da venda real.</p>`);}
$('#design-form .size-guide-button').addEventListener('click',showSizeGuide);
$('#footer-size-guide').addEventListener('click',showSizeGuide);
$('#open-returns').addEventListener('click',()=>showInfo('Trocas e devoluções','<p>Política demonstrativa. Os termos reais devem ser definidos antes de iniciar vendas.</p><h3>30 dias para decidir</h3><p>Peças do catálogo podem ser trocadas ou devolvidas em até 30 dias após o recebimento, sem uso, com etiqueta e na embalagem original.</p><h3>Primeira troca por nossa conta</h3><p>Errou o tamanho? A primeira troca de tamanho tem envio de ida e volta gratuito.</p><h3>Camisetas personalizadas</h3><p>Peças criadas no estúdio são produzidas sob demanda e só entram em troca por defeito de fabricação ou erro de produção. Por isso a prévia é aprovada antes de produzir.</p>'));
$('#open-shipping').addEventListener('click',()=>showInfo('Entregas e prazos',`<p>Valores e prazos demonstrativos.</p><h3>Padrão</h3><p>R$ 14,90 · 5 a 8 dias úteis. Grátis em pedidos a partir de ${money(FREE_SHIPPING_MIN)} em produtos.</p><h3>Expressa</h3><p>R$ 24,90 · 2 a 3 dias úteis.</p><h3>Personalizadas</h3><p>Peças do estúdio somam 3 dias úteis de produção ao prazo de entrega. Estampas sob medida entram em produção após a aprovação da prévia.</p><h3>Acompanhamento</h3><p>Em uma loja real, o código de rastreio seria enviado por e-mail assim que a peça saísse para entrega.</p>`));
$('#open-contact').addEventListener('click',()=>showInfo('Fale com a gente','<p>Canal de atendimento demonstrativo.</p><h3>Como funcionaria</h3><p>Atendimento por WhatsApp e e-mail, de segunda a sexta, das 9h às 18h. Dúvidas sobre tamanho, prazo ou estampa respondidas em até um dia útil.</p><h3>Por enquanto</h3><p>Esta versão não envia nem recebe mensagens. Consulte as dúvidas frequentes para as respostas mais comuns.</p>'));
$('#newsletter').addEventListener('submit',async e=>{e.preventDefault();const form=e.target;if(!form.reportValidity())return;if(form.elements.namedItem('website').value){form.reset();return;}if(!online()){form.reset();toast('Cadastro demonstrativo: nenhum e-mail foi enviado ou guardado.');return;}const button=$('button[type=submit]',form);button.disabled=true;try{await rpc('subscribe_newsletter',{p_email:form.elements.namedItem('email').value});form.reset();toast('Pronto! Você está na lista. Sem spam, só novidades.');}catch(error){toast(error.message);}finally{button.disabled=false;}});
function showInfo(title,html){$('#info-title').textContent=title;$('#info-content').innerHTML=html;openDialog('#info-dialog');}
function itemThumb(item){return `<div class="cart-thumb">${item.preview&&validImageURL(item.preview)?`<img src="${item.preview}" alt="${esc(item.name)}">`:teePicture(item.base,esc(item.name),'88px')+graphicHTML(item)}</div>`;}
function showCart(){renderCart();openDialog('#cart-dialog');}
function renderCart(){
 $('#cart-title-count').textContent=`(${totals(cart).count})`;
 if(!cart.length){$('#cart-content').innerHTML=`<div class="empty-state"><h3>Espaço para o seu próximo favorito.</h3><p>Sua sacola está vazia. Encontre uma peça ou crie a sua.</p><button class="button button-blue" id="continue-shopping">Explorar a coleção <span>↗</span></button></div>`;$('#continue-shopping').addEventListener('click',()=>{closeDialog($('#cart-dialog'));location.hash='colecao';});return;}
 const t=totals(cart);
 $('#cart-content').innerHTML=cart.map(item=>`<article class="cart-item">${itemThumb(item)}<div><h3>${esc(item.name)}</h3><p>${esc(item.color)} / ${esc(item.size)}</p>${item.id==='custom'?(customMode(item.design)==='brief'?`<p class="brief-excerpt">“${esc(item.design.brief)}”</p><p>Arte criada pela equipe · prévia para aprovação</p>`:'<p>Estampa personalizada inclusa</p>'):''}<div class="cart-item-bottom"><div class="quantity"><button data-qty="-1" data-key="${esc(item.key)}" aria-label="Diminuir quantidade de ${esc(item.name)}">−</button><span>${item.qty}</span><button data-qty="1" data-key="${esc(item.key)}" aria-label="Aumentar quantidade de ${esc(item.name)}" ${item.qty>=10?'disabled':''}>+</button></div><strong class="price">${money(item.price*item.qty)}</strong></div><button class="remove-item" data-remove="${esc(item.key)}">Remover</button></div></article>`).join('')+`<div class="cart-summary"><div class="summary-row"><span>Subtotal</span><span>${money(t.subtotal)}</span></div><div class="summary-row"><span>Entrega padrão</span><span>${t.delivery?money(t.delivery):'Grátis'}</span></div>${shippingProgressHTML(t.subtotal)}<div class="summary-row summary-total"><span>Total estimado</span><span>${money(t.total)}</span></div><button class="button button-blue" id="begin-checkout">Continuar para compra <span>→</span></button><button class="text-button" id="keep-shopping">Continuar comprando</button><p class="helper">Pré-lançamento: nenhum valor é cobrado por enquanto.</p></div>`;
 $('#begin-checkout').addEventListener('click',()=>{closeDialog($('#cart-dialog'));showCheckout();});
 $('#keep-shopping').addEventListener('click',()=>{closeDialog($('#cart-dialog'));location.hash='colecao';});
 $('[data-suggest]',$('#cart-content'))?.addEventListener('click',e=>{closeDialog($('#cart-dialog'));showProduct(e.currentTarget.dataset.suggest);});
}
function shippingProgressHTML(subtotal){
 const remaining=FREE_SHIPPING_MIN-subtotal,pct=Math.min(100,Math.round(subtotal/FREE_SHIPPING_MIN*100));
 if(remaining<=0)return `<div class="shipping-progress unlocked"><p><strong>Frete grátis liberado.</strong> Entrega padrão por nossa conta.</p><div class="progress-track"><div class="progress-fill" style="width:100%"></div></div></div>`;
 const s=shippingSuggestion(cart);
 return `<div class="shipping-progress"><p>Faltam <strong>${money(remaining)}</strong> para o frete grátis.</p><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>${s?`<button class="suggestion" data-suggest="${s.id}"><span class="suggestion-thumb">${teePicture(s.base,'','60px')}${graphicHTML(s)}</span><span><strong>Complete com ${esc(s.name)}</strong><small>${money(s.price)} · ${s.price>=remaining?'libera o frete grátis':'e chegue mais perto'}</small></span><span class="suggestion-arrow">→</span></button>`:''}</div>`;
}
$('#open-cart').addEventListener('click',showCart);
$('#cart-content').addEventListener('click',e=>{const q=e.target.closest('[data-qty]'),r=e.target.closest('[data-remove]');if(q)cart=changeQuantity(cart,q.dataset.key,Number(q.dataset.qty));if(r)cart=cart.filter(i=>i.key!==r.dataset.remove);if(q||r){saveCart();renderCart();}});

function showCheckout(){
 if(!cart.length){showCart();return;}
 const live=online();
 $('#checkout-content').innerHTML=`<div class="demo-note">${live?'Pagamento ainda não integrado: o pedido é registrado como “aguardando pagamento” e nenhum valor é cobrado agora.':'Este é um pedido de demonstração: não há cobrança nem envio de produtos. Use dados fictícios.'}</div><form id="checkout-form"><div class="checkout-columns"><div class="checkout-fields"><div style="display:flex;justify-content:space-between;gap:15px;align-items:center"><h3>Dados para entrega</h3>${live?'':'<button type="button" class="text-button" id="fill-demo">Preencher exemplo</button>'}</div><label>Nome<input name="name" autocomplete="name" required minlength="3" maxlength="80" placeholder="Seu nome"></label><label>E-mail<input name="email" type="email" autocomplete="email" required maxlength="120" placeholder="voce@exemplo.com"></label><div class="field-row" style="margin:0"><label>CEP<input name="cep" inputmode="numeric" autocomplete="postal-code" required pattern="[0-9]{5}-?[0-9]{3}" maxlength="9" placeholder="00000-000" title="Informe 8 dígitos, com ou sem hífen"></label><label>Cidade<input name="city" autocomplete="address-level2" required minlength="2" maxlength="80" placeholder="Sua cidade"></label></div><label>Endereço e número<input name="address" autocomplete="street-address" required minlength="5" maxlength="160" placeholder="Rua Exemplo, 123"></label><fieldset><legend>Entrega</legend><label class="radio-option"><input type="radio" name="shipping" value="standard" checked> Padrão · 5 a 8 dias úteis</label><label class="radio-option"><input type="radio" name="shipping" value="express"> Expressa · 2 a 3 dias úteis · R$ 24,90</label></fieldset><fieldset><legend>Pagamento</legend><label class="radio-option"><input type="radio" name="payment" value="Pix" checked> Pix</label><label class="radio-option"><input type="radio" name="payment" value="Cartão"> Cartão</label><p class="helper">${live?'Nenhum dado bancário é pedido aqui. A cobrança ainda não está ativa.':'Nenhum dado bancário é necessário. A aprovação é simulada.'}</p></fieldset></div><aside class="checkout-summary" id="checkout-summary" aria-live="polite"></aside></div><button type="submit" class="button button-blue checkout-submit">${live?'Confirmar pedido':'Confirmar pedido demonstrativo'} <span>→</span></button><p class="helper">${live?'Seus dados de entrega ficam guardados com segurança, só para este pedido. O histórico de itens fica também neste navegador.':'Nome, e-mail e endereço não são armazenados. O histórico de itens fica apenas neste navegador.'}</p></form>`;
 const form=$('#checkout-form');
 const user=getUser();
 if(user){const email=form.elements.namedItem('email');email.value=user.email;email.readOnly=true;loadProfile().then(p=>{for(const k of ['name','cep','city','address']){const input=form.elements.namedItem(k);if(p?.[k]&&!input.value)input.value=p[k];}if(!form.elements.namedItem('name').value&&user.name)form.elements.namedItem('name').value=user.name;});}
 const summary=()=>{const t=totals(cart,new FormData(form).get('shipping'));$('#checkout-summary').innerHTML=`<h3>Resumo · ${t.count} ${t.count===1?'peça':'peças'}</h3>${cart.map(i=>`<div class="summary-row"><span>${esc(i.name)} · ${esc(i.size)} × ${i.qty}</span><span>${money(i.price*i.qty)}</span></div>`).join('')}<div class="summary-row"><span>Subtotal</span><span>${money(t.subtotal)}</span></div><div class="summary-row"><span>Entrega</span><span>${t.delivery?money(t.delivery):'Grátis'}</span></div><div class="summary-row summary-total"><span>Total</span><span>${money(t.total)}</span></div>`;};
 form.addEventListener('change',summary);summary();
 $('#fill-demo')?.addEventListener('click',()=>{for(const [key,value] of Object.entries({name:'Cliente de Exemplo',email:'cliente@example.com',cep:'60000-000',city:'Fortaleza',address:'Rua de Exemplo, 123'}))form.elements.namedItem(key).value=value;});
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(!form.reportValidity()||!cart.length)return;
  const data=new FormData(form),payment=data.get('payment'),shipping=data.get('shipping'),button=$('.checkout-submit',form);
  let result;
  if(live){
   button.disabled=true;button.textContent='Registrando pedido…';
   try{result=await submitOrder(data,shipping,payment);}
   catch(error){toast(error.message);button.disabled=false;button.innerHTML='Confirmar pedido <span>→</span>';return;}
  }else{const t=totals(cart,shipping);result={code:`AV-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0,4).toUpperCase()}`,status:'demo',count:t.count,subtotal_cents:t.subtotal,delivery_cents:t.delivery,total_cents:t.total};}
  const order={id:result.code,status:result.status,date:new Date().toISOString(),payment,shipping,subtotal:result.subtotal_cents,delivery:result.delivery_cents,total:result.total_cents,count:result.count,items:cart.map(({id,name,color,size,qty,price,preview,design})=>({id,name,color,size,qty,price,...(preview?{preview,design}:{})}))};
  orders=[order,...orders].slice(0,12);
  try{localStorage.setItem(ORDERS_KEY,JSON.stringify(orders));}catch{toast('Pedido confirmado nesta sessão. O histórico não pôde ser salvo no navegador.');}
  cart=[];saveCart();profile=null;
  $('#checkout-content').innerHTML=`<div class="success"><span class="success-mark">✓</span><p class="eyebrow">${live?'PEDIDO REGISTRADO':'SIMULAÇÃO CONCLUÍDA'}</p><h3>Seu pedido ganhou forma.</h3><p>Pedido <span class="order-id">${esc(order.id)}</span><br>${money(order.total)} · ${esc(payment)}${live?'':' simulado'}</p><div class="demo-note">${live?'Guarde o código do pedido. Nenhum valor foi cobrado: o pagamento ainda não está integrado e o pedido fica como “aguardando pagamento”.':'Nenhuma cobrança foi feita. Este pedido não será produzido nem enviado.'}</div><button class="button button-blue" id="finish-order">Voltar à coleção <span>↗</span></button><p class="helper" style="margin-top:20px">O resumo está em “Meus pedidos”, no rodapé.</p></div>`;
  $('#finish-order').addEventListener('click',()=>{closeDialog($('#checkout-dialog'));location.hash='colecao';});
 });
 openDialog('#checkout-dialog');
}
async function submitOrder(data,shipping,payment){
 const items=[];
 for(const item of cart){
  if(item.id!=='custom'){items.push({kind:'catalog',product_id:item.id,size:item.size,qty:item.qty});continue;}
  const folder=crypto.randomUUID(),mode=customMode(item.design),{image,...design}=item.design||{};
  const preview_path=await uploadDesign(`${folder}/preview.jpg`,dataURLToBlob(item.preview));
  const image_path=image?await uploadDesign(`${folder}/art.webp`,dataURLToBlob(image)):null;
  items.push({kind:mode==='brief'?'brief':'custom',base:item.base,size:item.size,qty:item.qty,design,preview_path,image_path});
 }
 return rpc('place_order',{p_customer:{name:data.get('name'),email:data.get('email'),cep:data.get('cep'),city:data.get('city'),address:data.get('address')},p_shipping:shipping,p_payment:payment,p_items:items});
}
const STATUS_LABEL={aguardando_pagamento:'Aguardando pagamento',pago:'Pagamento confirmado',em_producao:'Em produção',enviado:'Enviado',entregue:'Entregue',cancelado:'Cancelado'};
function orderRecordHTML(code,total,line,items){return `<article class="order-record"><strong>${esc(code)} · ${money(total)}</strong><p>${line}</p><ul>${items}</ul></article>`;}
function ordersHTML(){
 const list=orders.length?`<p>Histórico deste navegador.${online()?' Para ver o status atual, consulte pelo código e e-mail abaixo.':' Todos os pedidos são demonstrativos.'}</p>${orders.map(o=>orderRecordHTML(o.id,o.total,`${esc(new Date(o.date).toLocaleDateString('pt-BR'))} · ${esc(o.payment)}${o.status==='demo'?' simulado':''}`,o.items.map(i=>`<li>${esc(i.name)} · ${esc(i.color)} · ${esc(i.size)} × ${esc(i.qty)}${i.design?.brief?`<br><small>“${esc(i.design.brief)}”</small>`:''}</li>`).join(''))).join('')}`:'<div class="empty-state"><h3>Nenhum pedido por aqui.</h3><p>Finalize uma compra para ver seu histórico.</p></div>';
 const lookup=online()?'<form id="order-lookup" class="order-lookup"><h3>Consultar status</h3><div class="field-row"><label>Código<input name="code" required maxlength="24" placeholder="AV-XXXXXXXXXXX-XXXX" autocomplete="off"></label><label>E-mail do pedido<input name="email" type="email" required maxlength="120" autocomplete="email"></label></div><button type="submit" class="button button-blue">Consultar <span>→</span></button><div id="lookup-result" aria-live="polite"></div></form>':'';
 return list+lookup;
}
$('#view-orders').addEventListener('click',()=>{
 if(getUser()){showAccount();return;}
 showInfo('Meus pedidos',ordersHTML());
 $('#order-lookup')?.addEventListener('submit',async e=>{
  e.preventDefault();const form=e.target,out=$('#lookup-result');if(!form.reportValidity())return;
  out.textContent='Consultando…';
  try{const o=await rpc('get_order',{p_code:new FormData(form).get('code'),p_email:new FormData(form).get('email')});
   out.innerHTML=o?orderRecordHTML(o.code,o.total_cents,`${esc(STATUS_LABEL[o.status]||o.status)} · ${esc(new Date(o.created_at).toLocaleDateString('pt-BR'))} · ${esc(o.payment)}`,(o.items||[]).map(i=>`<li>${esc(i.name)} · ${i.base==='white'?'Branco giz':'Preto lavado'} · ${esc(i.size)} × ${esc(i.qty)}</li>`).join('')):'<p class="helper">Nenhum pedido encontrado com esse código e e-mail.</p>';
  }catch(error){out.innerHTML=`<p class="helper">${esc(error.message)}</p>`;}
 });
});
$('#open-help').addEventListener('click',()=>showInfo('Dúvidas frequentes','<h3>Esta loja já vende produtos?</h3><p>Estamos em pré-lançamento. Os pedidos são registrados de verdade, com código para acompanhamento, mas o pagamento ainda não está integrado: nenhum valor é cobrado por enquanto e a equipe entra em contato pelo e-mail informado.</p><h3>Como funciona a personalização?</h3><p>Escolha uma base branca ou preta, escreva seu texto e envie uma imagem PNG, JPG ou WebP. Ajuste tamanho, posição vertical e rotação. A prévia acompanha a peça na sacola.</p><h3>E se eu não souber desenhar?</h3><p>No estúdio, escolha “Descrever a ideia” e conte como imagina a estampa: cores, estilo, frases, referências. A equipe cria a arte e envia a prévia para aprovação antes de produzir. A criação está incluída no preço da peça sob medida.</p><h3>Minha imagem é enviada para algum lugar?</h3><p>A prévia é montada no seu navegador. Só quando você confirma o pedido a prévia e a arte enviada são guardadas em um espaço privado da loja, ligadas ao seu pedido, para a produção. A sacola fica salva apenas neste dispositivo.</p><h3>Como funciona a entrega?</h3><p>Frete padrão de R$ 14,90, grátis a partir de R$ 250 em produtos, ou expresso de R$ 24,90. Prazos e valores de pré-lançamento.</p><h3>E as trocas?</h3><p>A política demonstrativa está em “Trocas e devoluções”, no rodapé: 30 dias para peças do catálogo, primeira troca de tamanho grátis, e personalizadas só por defeito. Os termos reais devem ser definidos antes de iniciar vendas.</p>'));

// All image processing stays in this browser. Preview and exported design share one renderer.
const canvas=$('#design-canvas'),ctx=canvas.getContext('2d');
const imageCache={};
function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Não foi possível carregar a imagem.'));img.src=src;});}
function readAsDataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('Não foi possível ler esse arquivo. Escolha outra imagem.'));r.readAsDataURL(file);});}
let uploadImage=null,uploadData=null,uploadGeneration=0,designReady=false;
const designDefaults={color:'white',garment:'',size:'M',text:'DO MEU\nJEITO.',font:'condensed',ink:'#1737bc',scale:80,x:0,y:0,rotation:0,brief:''};
let designMode='create';
function setMode(mode){
 designMode=mode;
 $$('[data-mode]').forEach(b=>{const on=b.dataset.mode===mode;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
 $('#create-fields').hidden=mode!=='create';$('#brief-fields').hidden=mode!=='brief';
 $('#custom-label').textContent=mode==='brief'?'Sua camiseta com estampa sob medida':'Sua camiseta personalizada';
 $('#custom-price').textContent=money(CUSTOM[mode].price);
 const base=PRODUCTS.find(p=>p.id==='essencial-branca').price;
 $('#custom-breakdown').textContent=`Base Essencial ${money(base)} + ${mode==='brief'?'criação da arte e estampa':'estampa frontal'} ${money(CUSTOM[mode].price-base)}`;
 $('#custom-helper').textContent=mode==='brief'?'Criação da arte inclusa. Você aprova a prévia antes da produção.':'Personalização frontal inclusa.';
 renderDesign();
}
$$('[data-mode]').forEach(b=>b.addEventListener('click',()=>{setMode(b.dataset.mode);if(b.dataset.mode==='brief')$('#design-brief').focus();}));
$$('.starter').forEach(b=>b.addEventListener('click',()=>{$('#design-text').value=b.dataset.starter;renderDesign();$('#design-text').focus();}));
function syncSwatches(){const ink=$('#design-ink').value.toLowerCase();$$('.swatch[data-ink]').forEach(b=>{const on=b.dataset.ink===ink;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});}
$$('.swatch[data-ink]').forEach(b=>b.addEventListener('click',()=>{$('#design-ink').value=b.dataset.ink;syncSwatches();renderDesign();}));
function getDesign(){return {mode:designMode,color:$('#design-color').value,garment:$('#design-garment').value,size:$('#design-size').value,text:$('#design-text').value,font:$('#design-font').value,ink:$('#design-ink').value,scale:Number($('#design-scale').value),x:Number($('#design-x').value),y:Number($('#design-y').value),rotation:Number($('#design-rotation').value),brief:$('#design-brief').value.trim()};}
const colorName=d=>d.garment?`cor personalizada ${d.garment}`:d.color==='white'?'branca':'preta';
const fontFamily={condensed:'"Barlow Condensed", Impact, sans-serif',sans:'Manrope, Arial, sans-serif',serif:'Georgia, serif'};
function renderDesign(){
 const d=getDesign();
 $('#scale-output').textContent=`${d.scale}%`;$('#position-output').textContent=d.y===0?'Centro':d.y<0?'Mais acima':'Mais abaixo';$('#x-output').textContent=d.x===0?'Centro':d.x<0?'Para a esquerda':'Para a direita';$('#rotation-output').textContent=`${d.rotation}°`;
 if(!imageCache[d.color])return;
 ctx.clearRect(0,0,1000,1000);ctx.drawImage(imageCache[d.color],0,0,1000,1000);
 const hasText=drawPrint(ctx,d,true);
 if(d.mode==='brief')canvas.setAttribute('aria-label',`Prévia: camiseta ${colorName(d)}, tamanho ${d.size}, área reservada para a estampa descrita`);
 else canvas.setAttribute('aria-label',`Prévia: camiseta ${colorName(d)}, tamanho ${d.size}${hasText?`, texto ${d.text.replace(/\n/g,' ')}`:''}${uploadImage?', com imagem personalizada':''}`);
 document.dispatchEvent(new CustomEvent('doavesso:design',{detail:d}));
}
// Desenha só a estampa (texto/imagem ou o marcador do briefing) em um contexto 1000×1000.
// Com placed=true aplica posição/rotação/escala como na prévia; senão, centrada e sem transformação (textura 3D).
function drawPrint(c,d,placed){
 c.save();if(placed){c.translate(500+(d.x||0)*3.3,485+d.y*3.3);c.rotate(d.rotation*Math.PI/180);c.scale(d.scale/100,d.scale/100);}else c.translate(500,500);
 const width=300,height=330;
 if(d.mode==='brief'){drawBriefPlaceholder(c,d,width,height);c.restore();return false;}
 c.beginPath();c.rect(-width/2,-height/2,width,height);c.clip();
 const hasText=d.text.trim().length>0;
 let textTop=-height/2,textHeight=height;
 if(uploadImage){const available=hasText?height*.61:height;const fit=Math.min(width/uploadImage.width,available/uploadImage.height);const w=uploadImage.width*fit,h=uploadImage.height*fit;c.drawImage(uploadImage,-w/2,-height/2+(available-h)/2,w,h);if(hasText){textTop=-height/2+available+10;textHeight=height-available-10;}}
 if(hasText){
  const lines=d.text.split('\n');let fontSize=Math.min(100,textHeight/(lines.length*1.03));
  c.font=`800 ${fontSize}px ${fontFamily[d.font]}`;
  const widest=Math.max(...lines.map(line=>c.measureText(line).width));if(widest>width-8)fontSize*=(width-8)/widest;
  c.font=`800 ${fontSize}px ${fontFamily[d.font]}`;c.textAlign='center';c.textBaseline='middle';c.fillStyle=d.ink;
  const spacing=fontSize*1.03,start=textTop+textHeight/2-(lines.length-1)*spacing/2;
  lines.forEach((line,i)=>c.fillText(line,0,start+i*spacing,width));
 }
 c.restore();return hasText;
}
window.doavessoStudio={getDesign,drawPrint:(c,d)=>drawPrint(c,d,false),ready:()=>readyDesign};
function drawBriefPlaceholder(ctx,d,width,height){
 const ink=d.color==='white'?'#1737bc':'#f7f8f9';
 ctx.strokeStyle=ink;ctx.lineWidth=3;ctx.setLineDash([14,10]);ctx.strokeRect(-width/2,-height/2,width,height);ctx.setLineDash([]);
 for(const [x,y] of [[-width/2,-height/2],[width/2,-height/2],[-width/2,height/2],[width/2,height/2]]){ctx.fillStyle='#fff';ctx.fillRect(x-7,y-7,14,14);ctx.strokeRect(x-7,y-7,14,14);}
 ctx.fillStyle=ink;ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.font=`800 48px ${fontFamily.condensed}`;ctx.fillText('SUA ESTAMPA',0,-32,width-20);ctx.fillText('SOB MEDIDA',0,18,width-20);
 ctx.font=`600 15px ${fontFamily.sans}`;ctx.fillText(d.brief?'A PARTIR DA SUA DESCRIÇÃO':'DESCREVA A IDEIA AO LADO',0,78,width-24);
}
const readyDesign=Promise.all([loadImage('assets/tee-white-1000.webp'),loadImage('assets/tee-black-1000.webp'),document.fonts.ready]).then(([white,black])=>{imageCache.white=white;imageCache.black=black;designReady=true;renderDesign();}).catch(()=>toast('Não foi possível carregar a base da camiseta. Atualize a página para tentar de novo.'));
$('#design-form').addEventListener('input',e=>{if(e.target.id==='design-brief')$('#brief-count').textContent=e.target.value.length;if(e.target.id==='design-ink')syncSwatches();if(e.target.type!=='file')renderDesign();});
$('#design-form').addEventListener('change',e=>{if(e.target.type!=='file')renderDesign();});
$('#design-color').addEventListener('change',()=>{$('#design-garment').value='';});
function clearUpload(){uploadGeneration++;uploadImage=null;uploadData=null;$('#design-upload').value='';$('#remove-upload').hidden=true;$('#upload-status').textContent='Use uma imagem sua ou que você tenha autorização para usar.';renderDesign();}
$('#remove-upload').addEventListener('click',clearUpload);
$('#design-upload').addEventListener('change',async e=>{
 const file=e.target.files[0];if(!file)return;
 const generation=++uploadGeneration;
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024){$('#upload-status').textContent='Escolha PNG, JPG ou WebP de até 5 MB.';e.target.value='';return;}
 $('#upload-status').textContent='Preparando sua imagem…';
 try{const url=await readAsDataURL(file);const original=await loadImage(url);if(original.width*original.height>40000000)throw new Error('Imagem muito grande. Use uma versão com até 40 megapixels.');const temp=document.createElement('canvas');const ratio=Math.min(1,700/Math.max(original.width,original.height));temp.width=Math.round(original.width*ratio);temp.height=Math.round(original.height*ratio);temp.getContext('2d').drawImage(original,0,0,temp.width,temp.height);const data=temp.toDataURL('image/webp',.85),image=await loadImage(data);if(generation!==uploadGeneration)return;uploadData=data;uploadImage=image;$('#remove-upload').hidden=false;$('#upload-status').textContent=`${file.name} · imagem pronta`;renderDesign();}catch(error){if(generation===uploadGeneration){$('#upload-status').textContent=error.message||'Não foi possível ler esse arquivo. Escolha outra imagem.';e.target.value='';}}
});
$('#reset-design').addEventListener('click',()=>{for(const [key,value] of Object.entries(designDefaults))$(`#design-${key}`).value=value;$('#brief-count').textContent='0';syncSwatches();clearUpload();setMode('create');toast('Estúdio pronto para uma nova ideia.');});
$('#download-design').addEventListener('click',async()=>{await readyDesign;if(!designReady)return;renderDesign();canvas.toBlob(blob=>{if(!blob){toast('Não foi possível gerar a prévia. Tente novamente.');return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='doavesso-minha-camiseta.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},'image/png');});
$('#design-form').addEventListener('submit',async e=>{
 e.preventDefault();await readyDesign;if(!designReady)return;
 const d=getDesign();
 if(d.mode==='brief'){if(d.brief.length<10){toast('Descreva sua ideia com pelo menos 10 caracteres para a equipe entender.');$('#design-brief').focus();return;}}
 else if(!d.text.trim()&&!uploadImage){toast('Adicione um texto ou uma imagem à sua estampa.');$('#design-text').focus();return;}
 renderDesign();const thumb=document.createElement('canvas');thumb.width=500;thumb.height=500;thumb.getContext('2d').drawImage(canvas,0,0,500,500);
 const design=d.mode==='brief'?{mode:'brief',color:d.color,garment:d.garment,size:d.size,brief:d.brief,scale:d.scale,x:d.x,y:d.y,rotation:d.rotation}:{...d,brief:undefined,image:uploadData};
 const item={id:'custom',key:`custom-${crypto.randomUUID()}`,name:CUSTOM[d.mode].name,category:'custom',base:d.color,color:garmentLabel(design),size:d.size,price:CUSTOM[d.mode].price,preview:thumb.toDataURL('image/jpeg',.85),design};
 try{cart=addItem(cart,item);saveCart();showCart();}catch(error){toast(error.message);}
});

function route(){
 const hash=location.hash||'#inicio',studio=hash==='#estudio';
 $('#shop-view').hidden=studio;$('#studio-view').hidden=!studio;document.documentElement.classList.toggle('studio',studio);
 document.title=studio?'Crie sua camiseta personalizada — doavesso Studio':'doavesso — Camisetas oversized e estampas personalizadas';
 if(hash.startsWith('#produto-'))showProduct(hash.slice(9));
 if(studio){window.scrollTo({top:0,behavior:'instant'});renderDesign();}
 else if(['#inicio','#colecao','#sobre'].includes(hash))requestAnimationFrame(()=>$(hash).scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));
}
window.addEventListener('hashchange',route);
$('#product-dialog').addEventListener('close',()=>{if(location.hash.startsWith('#produto-'))history.replaceState(null,'','#colecao');});
window.addEventListener('storage',e=>{if(e.key===CART_KEY){cart=normalizeCart(readStored(CART_KEY,[]));updateCartCount();if($('#cart-dialog').open)renderCart();if($('#checkout-dialog').open){closeDialog($('#checkout-dialog'));toast('A sacola mudou em outra aba. Confira os itens antes de finalizar.');}}});
updateCartCount();route();

// Contas ------------------------------------------------------------------------
let profile=null;
const firstName=user=>(user?.name||user?.email||'').split(/[\s@]/)[0];
function renderAuthState(){
 const user=getUser();
 $('#open-auth').hidden=!!user;$('#open-account').hidden=!user;
 if(user)$('#open-account').textContent=`Olá, ${firstName(user)}`;
 $('#mobile-account').textContent=user?'Minha conta':'Entrar';
}
window.addEventListener('doavesso:auth',()=>{profile=null;renderAuthState();});
function setAuthStatus(message,kind=''){const el=$('#auth-status');el.textContent=message;el.className=`auth-status ${kind}`;}
function showAuthTab(tab){
 $$('[data-auth-tab]').forEach(b=>{const on=b.dataset.authTab===tab;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));});
 $('#login-form').hidden=tab!=='login';$('#signup-form').hidden=tab!=='signup';$('#password-form').hidden=tab!=='password';
 $('.auth-tabs').hidden=tab==='password';$('#google-signin').hidden=tab==='password';$('.auth-divider').hidden=tab==='password';
 $('#auth-title').textContent=tab==='signup'?'Criar conta':tab==='password'?'Nova senha':'Entrar';
 setAuthStatus('');
}
function openAuth(tab='login'){if(!online()){toast('Contas indisponíveis no modo offline.');return;}showAuthTab(tab);openDialog('#auth-dialog');setTimeout(()=>$(`#${tab}-form input`)?.focus(),50);}
$('#open-auth').addEventListener('click',()=>openAuth('login'));
$('#mobile-account').addEventListener('click',()=>{$('#mobile-menu').hidden=true;getUser()?showAccount():openAuth('login');});
$$('[data-auth-tab]').forEach(b=>b.addEventListener('click',()=>showAuthTab(b.dataset.authTab)));
async function busy(form,work){
 const button=$('button[type=submit]',form);button.disabled=true;
 try{await work();}catch(error){setAuthStatus(error.message,'error');}finally{button.disabled=false;}
}
$('#login-form').addEventListener('submit',e=>{
 e.preventDefault();const form=e.target;if(!form.reportValidity())return;
 busy(form,async()=>{const user=await signIn(form.elements.namedItem('email').value.trim(),form.elements.namedItem('password').value);form.reset();closeDialog($('#auth-dialog'));toast(`Bem-vindo de volta, ${firstName(user)}.`);});
});
$('#signup-form').addEventListener('submit',e=>{
 e.preventDefault();const form=e.target;if(!form.reportValidity())return;
 busy(form,async()=>{const result=await signUp(form.elements.namedItem('email').value.trim(),form.elements.namedItem('password').value,form.elements.namedItem('name').value.trim());form.reset();if(result.confirmed){closeDialog($('#auth-dialog'));toast('Conta criada. Bem-vindo à doavesso.');}else setAuthStatus('Conta criada! Enviamos um e-mail de confirmação — abra o link para ativar e depois entre aqui.','ok');});
});
$('#forgot-password').addEventListener('click',async()=>{
 const email=$('#login-form input[name=email]').value.trim();
 if(!email){setAuthStatus('Digite seu e-mail acima e clique de novo em “Esqueci minha senha”.','error');$('#login-form input[name=email]').focus();return;}
 try{await resetPassword(email);setAuthStatus('Se existir conta com este e-mail, você recebe um link para criar uma nova senha.','ok');}catch(error){setAuthStatus(error.message,'error');}
});
$('#password-form').addEventListener('submit',e=>{
 e.preventDefault();const form=e.target;if(!form.reportValidity())return;
 busy(form,async()=>{await updatePassword(form.elements.namedItem('password').value);form.reset();closeDialog($('#auth-dialog'));toast('Senha atualizada.');});
});
$('#google-signin').addEventListener('click',()=>{setAuthStatus('Redirecionando para o Google…');signInWithGoogle().catch(error=>setAuthStatus(error.message,'error'));});

const ORDER_STATUS={aguardando_pagamento:'Aguardando pagamento',pago:'Pagamento confirmado',em_producao:'Em produção',enviado:'Enviado',entregue:'Entregue',cancelado:'Cancelado'};
async function loadProfile(){if(profile||!getUser())return profile;try{profile=await fetchProfile();}catch{profile=null;}return profile;}
const UF_LIST=[['AC','Acre'],['AL','Alagoas'],['AP','Amapá'],['AM','Amazonas'],['BA','Bahia'],['CE','Ceará'],['DF','Distrito Federal'],['ES','Espírito Santo'],['GO','Goiás'],['MA','Maranhão'],['MT','Mato Grosso'],['MS','Mato Grosso do Sul'],['MG','Minas Gerais'],['PA','Pará'],['PB','Paraíba'],['PR','Paraná'],['PE','Pernambuco'],['PI','Piauí'],['RJ','Rio de Janeiro'],['RN','Rio Grande do Norte'],['RS','Rio Grande do Sul'],['RO','Rondônia'],['RR','Roraima'],['SC','Santa Catarina'],['SP','São Paulo'],['SE','Sergipe'],['TO','Tocantins']];
function shipLabel(s){return s==='express'?'Frete expresso':'Frete padrão';}
function orderCardHTML(o){
 const items=(o.order_items||[]).map(i=>`<li><span class="oi-name">${esc(i.name)}</span><span class="oi-meta">${i.base==='white'?'Branco giz':'Preto lavado'} · Tam ${esc(i.size)} · ${esc(i.qty)}×</span><span class="oi-price">${money((i.unit_price_cents||0)*i.qty)}</span></li>`).join('');
 const st=o.status||'';
 return `<article class="order-card"><div class="order-card-top"><div class="order-code-wrap"><span class="order-code">${esc(o.code)}</span><span class="order-date">${esc(new Date(o.created_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'}))}</span></div><span class="status-badge status-${esc(st)}">${esc(ORDER_STATUS[st]||st)}</span></div><ul class="order-items">${items}</ul><div class="order-card-foot"><span class="order-ship">${esc(shipLabel(o.shipping))} · ${esc(o.payment)}</span><span class="order-total">Total <strong>${money(o.total_cents)}</strong></span></div></article>`;
}
function maskCEP(s){return s.replace(/\D/g,'').slice(0,8).replace(/(\d{5})(\d)/,'$1-$2');}
function maskCPF(s){return s.replace(/\D/g,'').slice(0,11).replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2');}
function maskPhone(s){s=s.replace(/\D/g,'').slice(0,11);if(s.length<=10)return s.replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{4})(\d{1,4})$/,'$1-$2');return s.replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{5})(\d{1,4})$/,'$1-$2');}
function validCPF(cpf){cpf=cpf.replace(/\D/g,'');if(cpf.length!==11||/^(\d)\1{10}$/.test(cpf))return false;let s=0;for(let i=0;i<9;i++)s+=+cpf[i]*(10-i);let d=11-s%11;if(d>=10)d=0;if(d!==+cpf[9])return false;s=0;for(let i=0;i<10;i++)s+=+cpf[i]*(11-i);d=11-s%11;if(d>=10)d=0;return d===+cpf[10];}
function resizeAvatar(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{const size=200,c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d');const scale=Math.max(size/img.width,size/img.height),w=img.width*scale,h=img.height*scale;ctx.drawImage(img,(size-w)/2,(size-h)/2,w,h);resolve(c.toDataURL('image/webp',.82));};img.onerror=()=>reject(new Error('Não foi possível ler essa imagem.'));img.src=src;});}
async function loadCities(uf,cityInput,keep){
 const dl=$('#doavesso-cities');if(dl)dl.innerHTML='';
 cityInput.disabled=false;if(!keep)cityInput.value='';
 if(!uf)return;
 try{const res=await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);if(!res.ok)return;const cities=await res.json();if(dl)dl.innerHTML=cities.map(c=>`<option value="${esc(c.nome)}"></option>`).join('');}catch{}
}
async function cepLookup(cep,fields){
 const digits=cep.replace(/\D/g,'');if(digits.length!==8)return;
 fields.status.textContent='Buscando endereço…';
 try{const res=await fetch(`https://viacep.com.br/ws/${digits}/json/`);if(!res.ok)throw 0;const d=await res.json();if(d.erro){fields.status.textContent='CEP não encontrado.';return;}
  if(d.uf){fields.state.value=d.uf;await loadCities(d.uf,fields.city,false);}
  if(d.localidade)fields.city.value=d.localidade;
  if(d.logradouro&&!fields.address.value.trim())fields.address.value=d.logradouro;
  fields.status.textContent='Endereço preenchido pelo CEP.';fields.address.focus();
 }catch{fields.status.textContent='Não foi possível buscar o CEP agora. Preencha manualmente.';}
}
function avatarInner(p,user){return p&&p.avatar?`<img src="${esc(p.avatar)}" alt="Sua foto de perfil">`:esc((user.name||user.email||'?').trim().charAt(0).toUpperCase());}
async function showAccount(tab){
 const user=getUser();if(!user){openAuth('login');return;}
 $('#account-content').innerHTML='<p class="helper">Carregando sua conta…</p>';openDialog('#account-dialog');
 let orders=[],p=null;
 try{[orders,p]=await Promise.all([fetchMyOrders(),loadProfile()]);}catch(error){$('#account-content').innerHTML=`<p class="helper">${esc(error.message)}</p>`;return;}
 let avatarData=p?.avatar||'';
 const ordersPanel=orders.length?`<div class="order-list">${orders.map(orderCardHTML).join('')}</div>`:'<div class="empty-state"><h3>Nenhum pedido ainda.</h3><p>Quando você comprar logado, seus pedidos aparecem aqui com o status atualizado.</p><button class="button button-blue" id="empty-shop">Ver a coleção <span>↗</span></button></div>';
 const cityEnabled=!!(p?.state||p?.city);
 const profilePanel=`<form id="profile-form" class="profile-form" novalidate>
  <div class="avatar-field"><div class="avatar-preview" id="avatar-preview">${avatarInner(p,user)}</div><div class="avatar-actions"><label class="text-button avatar-upload" for="avatar-input">${p?.avatar?'Trocar foto':'Enviar foto'}</label><input id="avatar-input" type="file" accept="image/png,image/jpeg,image/webp" hidden><button type="button" class="text-button" id="avatar-remove"${p?.avatar?'':' hidden'}>Remover</button><p class="helper" id="avatar-status">Foto opcional · JPG, PNG ou WebP · até 5 MB</p></div></div>
  <p class="panel-note">Seus dados ficam só com você e preenchem o checkout automaticamente.</p>
  <label>Nome completo<input name="name" maxlength="80" value="${esc(p?.name||'')}" autocomplete="name" placeholder="Como no documento"></label>
  <div class="field-row"><label>Telefone<input name="phone" inputmode="tel" maxlength="16" value="${esc(p?.phone?maskPhone(p.phone):'')}" autocomplete="tel" placeholder="(00) 00000-0000"></label><label>CPF<input name="cpf" inputmode="numeric" maxlength="14" value="${esc(p?.cpf?maskCPF(p.cpf):'')}" autocomplete="off" placeholder="000.000.000-00"></label></div>
  <div class="field-row"><label>CEP<input name="cep" inputmode="numeric" maxlength="9" value="${esc(p?.cep||'')}" autocomplete="postal-code" placeholder="00000-000"></label><label>País<select name="country"><option value="BR"${(p?.country||'BR')==='BR'?' selected':''}>Brasil</option></select></label></div>
  <div class="field-row"><label>Estado<select name="state"><option value="">Selecione…</option>${UF_LIST.map(([s,n])=>`<option value="${s}"${p?.state===s?' selected':''}>${esc(n)}</option>`).join('')}</select></label><label>Cidade<input name="city" list="doavesso-cities" maxlength="80" value="${esc(p?.city||'')}" autocomplete="address-level2" placeholder="${cityEnabled?'Sua cidade':'Escolha o estado primeiro'}"${cityEnabled?'':' disabled'}><datalist id="doavesso-cities"></datalist></label></div>
  <label>Endereço e número<input name="address" maxlength="160" value="${esc(p?.address||'')}" autocomplete="street-address" placeholder="Rua, número, complemento"></label>
  <div class="profile-actions"><button type="submit" class="button button-blue">Salvar dados <span>→</span></button>${user.provider==='google'?'':'<button type="button" class="text-button" id="change-password">Trocar senha</button>'}</div>
 </form>`;
 $('#account-content').innerHTML=`<header class="account-id"><span class="account-avatar" aria-hidden="true">${avatarInner(p,user)}</span><div class="account-id-text"><strong>${esc(user.name||firstName(user))}</strong><p>${esc(user.email)}${user.provider==='google'?' · <span class="provider-badge">Google</span>':''}</p></div><button class="account-signout" id="sign-out">Sair</button></header><nav class="account-tabs" role="tablist" aria-label="Seções da conta"><button type="button" role="tab" class="account-tab" data-acc-tab="orders" aria-selected="true">Pedidos${orders.length?`<span class="tab-count">${orders.length}</span>`:''}</button><button type="button" role="tab" class="account-tab" data-acc-tab="profile" aria-selected="false">Perfil</button></nav><section class="account-panel" data-acc-panel="orders">${ordersPanel}</section><section class="account-panel" data-acc-panel="profile" hidden>${profilePanel}</section>`;
 const accTabs=$$('.account-tab');
 accTabs.forEach(t=>t.addEventListener('click',()=>{accTabs.forEach(x=>x.setAttribute('aria-selected',String(x===t)));$$('.account-panel').forEach(pl=>{pl.hidden=pl.dataset.accPanel!==t.dataset.accTab;});}));
 if(tab==='profile')$('.account-tab[data-acc-tab="profile"]')?.click();
 $('#empty-shop')?.addEventListener('click',()=>{closeDialog($('#account-dialog'));location.hash='#colecao';});
 $('#sign-out').addEventListener('click',async()=>{await signOut();closeDialog($('#account-dialog'));toast('Você saiu da sua conta.');});
 $('#change-password')?.addEventListener('click',()=>{closeDialog($('#account-dialog'));openAuth('password');});
 const form=$('#profile-form'),el=n=>form.elements.namedItem(n);
 const stateEl=el('state'),cityEl=el('city'),addressEl=el('address'),cepEl=el('cep'),statusEl=$('#avatar-status');
 if(p?.state)loadCities(p.state,cityEl,true);
 stateEl.addEventListener('change',()=>loadCities(stateEl.value,cityEl,false));
 cepEl.addEventListener('input',()=>{cepEl.value=maskCEP(cepEl.value);if(cepEl.value.replace(/\D/g,'').length===8)cepLookup(cepEl.value,{state:stateEl,city:cityEl,address:addressEl,status:statusEl});});
 el('cpf').addEventListener('input',e=>e.target.value=maskCPF(e.target.value));
 el('phone').addEventListener('input',e=>e.target.value=maskPhone(e.target.value));
 const setAvatar=data=>{avatarData=data;const inner=data?`<img src="${esc(data)}" alt="Sua foto de perfil">`:esc((user.name||user.email||'?').trim().charAt(0).toUpperCase());$('#avatar-preview').innerHTML=inner;$('.account-avatar').innerHTML=inner;$('#avatar-remove').hidden=!data;$('.avatar-upload').textContent=data?'Trocar foto':'Enviar foto';};
 $('#avatar-input').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024){statusEl.textContent='Escolha JPG, PNG ou WebP de até 5 MB.';e.target.value='';return;}statusEl.textContent='Preparando foto…';try{const data=await resizeAvatar(await readAsDataURL(file));setAvatar(data);statusEl.textContent='Foto pronta. Salve para confirmar.';}catch(err){statusEl.textContent=err.message;}e.target.value='';});
 $('#avatar-remove').addEventListener('click',()=>{setAvatar('');statusEl.textContent='Foto removida. Salve para confirmar.';});
 form.addEventListener('submit',e=>{
  e.preventDefault();
  const cpfDigits=el('cpf').value.replace(/\D/g,''),phoneDigits=el('phone').value.replace(/\D/g,''),cepDigits=cepEl.value.replace(/\D/g,'');
  if(cepDigits&&cepDigits.length!==8){toast('CEP incompleto.');return;}
  if(phoneDigits&&phoneDigits.length<10){toast('Telefone incompleto.');return;}
  if(cpfDigits&&!validCPF(cpfDigits)){toast('CPF inválido. Confira os números.');return;}
  busyToast(form,async()=>{
   const data={name:el('name').value.trim(),cep:cepEl.value.trim(),country:el('country').value||'BR',state:stateEl.value||null,city:cityEl.value.trim(),address:addressEl.value.trim(),phone:phoneDigits||null,cpf:cpfDigits||null,avatar:avatarData||null};
   await updateProfile(data);profile={...profile,...data};renderAuthState();toast('Perfil salvo.');
  });
 });
}
async function busyToast(form,work){const button=$('button[type=submit]',form);button.disabled=true;try{await work();}catch(error){toast(error.message);}finally{button.disabled=false;}}
$('#open-account').addEventListener('click',showAccount);

handleAuthRedirect().then(outcome=>{
 renderAuthState();
 if(!outcome)return;
 if(outcome.type==='recovery')openAuth('password');
 else if(outcome.type==='signed_in')toast(`Bem-vindo, ${firstName(getUser())}.`);
 else if(outcome.type==='error')toast(outcome.message);
}).catch(()=>renderAuthState());

// Optional imperative WebMCP surface. Uses the same cart actions as the interface.
if(document.modelContext?.registerTool){
 const lifecycle=new AbortController();
 const register=tool=>{try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
 register({name:'read_doavesso_catalog_and_cart',title:'Ver catálogo e sacola',description:'Consulta produtos, tamanhos e sacola atual.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(input){if(!input||typeof input!=='object'||Object.keys(input).length)throw new Error('Informe um objeto vazio.');return {products:PRODUCTS.map(({id,name,price,color})=>({id,name,priceCents:price,color,sizes:SIZES})),cart:cart.map(({name,size,qty,price})=>({name,size,qty,priceCents:price})),totals:totals(cart)};}});
 register({name:'add_doavesso_catalog_item_to_cart',title:'Adicionar camiseta à sacola',description:'Adiciona uma unidade de um produto do catálogo à sacola local; não finaliza a compra.',inputSchema:{type:'object',properties:{productId:{type:'string',enum:PRODUCTS.map(p=>p.id)},size:{type:'string',enum:SIZES}},required:['productId','size'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||typeof input!=='object'||Object.keys(input).some(k=>!['productId','size'].includes(k)))throw new Error('Parâmetros inválidos.');if(!addCatalogItem(input.productId,input.size))throw new Error('Item não adicionado. Verifique os limites da sacola.');showCart();return {added:true,...totals(cart)};}});
 window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
