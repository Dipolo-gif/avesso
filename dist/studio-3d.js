// Lazy-loaded garment editor. Model provenance: assets/tee-LICENSE.txt.
// Cada estampa é um "projetor": a malha inteira da camiseta desenhada de novo com um material que
// projeta a arte a partir de um ponto e uma normal da superfície (frente, costas, mangas ou lateral).
// Mover, girar ou escalar só troca a matriz do projetor — sem reconstruir geometria durante o arraste.
import {CHEST_Y, UNIT, printFrame, frameUV, projectorMatrix, sliderPosition, zoneOf, dragPlace, ZONE_LABEL} from './studio-placement.js';
const $ = (s,r=document) => r.querySelector(s);
const preview = $('#design-preview'), footer = $('.preview-footer');
const canvas2d = $('#design-canvas'), form = $('#design-form');
const SWATCHES = [
  ['Branco giz','#f2f2ef','white'], ['Preto lavado','#15161a','black'],
  ['Off-white','#e9e4d8'], ['Cinza','#9a9da3'], ['Azul duavesso','#1737bc'],
  ['Verde musgo','#4c5a3f'], ['Vinho','#6b2233'], ['Areia','#cdb79a']
];
const ZONES = [['front','Frente'], ['back','Costas'], ['sleeve-left','Manga esq.'], ['sleeve-right','Manga dir.']];
const syncForm = () => form.dispatchEvent(new Event('input',{bubbles:true}));

function buildTools() {
  const el=document.createElement('div'); el.className='tee-tools'; el.hidden=true;
  el.innerHTML='<div class="tee-camera" role="group" aria-label="Vista da camiseta"><button type="button" data-view="front">Frente</button><button type="button" data-view="back">Costas</button><button type="button" data-view="detail">Detalhes</button></div>'
    +'<div class="tee-zones" role="group" aria-label="Levar a estampa selecionada para"><span class="tee-tools-label">Estampa em</span>'+ZONES.map(([z,l])=>`<button type="button" data-zone="${z}">${l}</button>`).join('')+'</div>'
    +'<span class="tee-tools-label">Cor da peça</span><div class="tee-swatches" role="group" aria-label="Cor da camiseta"></div><label class="tee-custom">Outra <input type="color" value="#1737bc" aria-label="Escolher outra cor da camiseta"></label>'
    +'<span class="tee-hint">Puxe a estampa para qualquer lugar da peça · arraste o tecido para girar · roda do mouse sobre a estampa muda o tamanho</span>';
  const row=$('.tee-swatches',el), custom=$('input[type=color]',el);
  function setGarment(hex,base) {
    $('#design-garment').value=base?'':hex.toLowerCase();
    const n=parseInt(hex.slice(1),16), light=.2126*(n>>16&255)+.7152*(n>>8&255)+.0722*(n&255);
    $('#design-color').value=base||(light>118?'white':'black'); syncForm();
  }
  for(const [name,hex,base] of SWATCHES) {
    const b=document.createElement('button'); b.type='button'; b.className='tee-swatch';
    b.title=name; b.setAttribute('aria-label',name); b.style.background=hex;
    b.dataset.hex=hex; if(base)b.dataset.base=base;
    b.addEventListener('click',()=>setGarment(hex,base)); row.appendChild(b);
  }
  custom.addEventListener('input',e=>setGarment(e.target.value));
  return {el, sync(d) {
    const hex=d.garment||(d.color==='white'?'#f2f2ef':'#15161a');
    for(const b of row.children)b.setAttribute('aria-pressed',String(b.dataset.hex===hex && Boolean(b.dataset.base)===!d.garment));
    custom.value=hex;
    const zone=d.mode==='brief'?'front':(d.prints?.[d.active]?.place?.zone||'front');
    for(const b of el.querySelectorAll('[data-zone]'))b.setAttribute('aria-pressed',String(b.dataset.zone===zone));
  }};
}

function fabricNormal(T) {
  const c=document.createElement('canvas'); c.width=c.height=128;
  const ctx=c.getContext('2d'), pixels=ctx.createImageData(128,128);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++) {
    const i=(y*128+x)*4;
    pixels.data[i]=128+Math.sin(x*Math.PI/2)*27;
    pixels.data[i+1]=128+Math.sin(y*Math.PI/2+(x%4)*.5)*27;
    pixels.data[i+2]=252; pixels.data[i+3]=255;
  }
  ctx.putImageData(pixels,0,0);
  const texture=new T.CanvasTexture(c); texture.wrapS=texture.wrapT=T.RepeatWrapping;
  texture.repeat.set(12,12); return texture;
}

// Grupo de superfície por vértice (0 corpo, 1 manga esquerda, 2 manga direita): uma estampa só pinta o
// seu grupo, então a arte da manga não vaza para o corpo escondido embaixo dela (nem o contrário).
const groupOfZone = zone => zone==='sleeve-left'?1:zone==='sleeve-right'?2:0;
function zoneGroups(T, geometry, halfWidth) {
  const pos=geometry.attributes.position, nor=geometry.attributes.normal, out=new Float32Array(pos.count);
  for(let i=0;i<pos.count;i++)out[i]=groupOfZone(zoneOf([pos.getX(i),pos.getY(i),pos.getZ(i)],[nor.getX(i),nor.getY(i),nor.getZ(i)],halfWidth));
  geometry.setAttribute('zone',new T.BufferAttribute(out,1));
}

async function createView(tools) {
  const T=await import('./vendor/three.js'), studio=window.duavessoStudio;
  await studio.ready();
  // Resolve assets before allocating a WebGL context; failed requests remain retryable.
  const [gltf,ao]=await Promise.all([
    new T.GLTFLoader().loadAsync(new URL('./assets/tee.glb',import.meta.url).href),
    new T.TextureLoader().loadAsync(new URL('./assets/tee-ao.webp',import.meta.url).href)
  ]);
  const tee=gltf.scene.getObjectByName('Tee');
  if(!tee?.isMesh)throw new Error('Modelo de camiseta inválido.');
  const el=document.createElement('canvas'); el.className='preview-3d'; el.hidden=true; el.tabIndex=0;
  el.setAttribute('role','img');
  el.setAttribute('aria-label','Camiseta 3D. Arraste uma estampa para movê-la por qualquer parte da peça e o tecido para girar. Setas giram a peça; Shift e setas movem a estampa selecionada.');
  const renderer=new T.WebGLRenderer({canvas:el,antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
  renderer.toneMapping=T.NeutralToneMapping;
  renderer.toneMappingExposure=.58;
  const scene=new T.Scene(), camera=new T.PerspectiveCamera(27,1,.05,20);
  const pmrem=new T.PMREMGenerator(renderer), room=new T.RoomEnvironment();
  const environment=pmrem.fromScene(room,.04); scene.environment=environment.texture;
  pmrem.dispose(); room.dispose();
  scene.add(new T.HemisphereLight(0xffffff,0x8c929a,.35));
  const key=new T.DirectionalLight(0xffffff,1.25); key.position.set(-1.8,2,2.4); scene.add(key);
  const fill=new T.DirectionalLight(0xffffff,.35); fill.position.set(1.8,.7,1); scene.add(fill);
  const rim=new T.DirectionalLight(0xffffff,.55); rim.position.set(.6,1.4,-2); scene.add(rim);
  const backLight=new T.DirectionalLight(0xffffff,.95); backLight.position.set(-1.8,1.6,-2.4); scene.add(backLight);

  gltf.scene.updateMatrixWorld(true);
  tee.geometry=tee.geometry.clone().applyMatrix4(tee.matrixWorld);
  tee.position.set(0,0,0); tee.rotation.set(0,0,0); tee.scale.set(1,1,1);
  const bounds=new T.Box3().setFromBufferAttribute(tee.geometry.attributes.position);
  const center=bounds.getCenter(new T.Vector3());
  tee.geometry.translate(-center.x,.36-center.y,-center.z);
  const halfWidth=Math.max(Math.abs(bounds.min.x-center.x),Math.abs(bounds.max.x-center.x));
  zoneGroups(T,tee.geometry,halfWidth);
  scene.add(tee); tee.updateMatrixWorld(true);
  const weave=fabricNormal(T); ao.flipY=false;
  const cloth=new T.MeshPhysicalMaterial({color:0xf2f2ef,metalness:0,roughness:.94,
    sheen:.14,sheenRoughness:1,envMapIntensity:.45,side:T.DoubleSide,
    normalMap:weave,normalScale:new T.Vector2(.08,.08),aoMap:ao,aoMapIntensity:.8});
  tee.material.dispose(); tee.material=cloth;

  // ---- estampas (projetores) ----
  const PROJ_DEPTH_FRONT=.09, PROJ_DEPTH_PLACE=.07;
  function printMaterial(texture) {
    const material=new T.MeshStandardMaterial({map:texture,transparent:true,depthWrite:false,
      polygonOffset:true,polygonOffsetFactor:-2,roughness:.94,metalness:0,envMapIntensity:.45,
      normalMap:weave,normalScale:new T.Vector2(.08,.08),aoMap:ao,aoMapIntensity:.8});
    const uniforms={projector:{value:new T.Matrix4()},projDir:{value:new T.Vector3(0,0,1)},zoneGroup:{value:0}};
    material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,uniforms);
      shader.vertexShader=shader.vertexShader
        .replace('#include <common>','#include <common>\nattribute float zone;\nvarying vec3 vPrintPos;\nvarying vec3 vPrintNormal;\nvarying float vZone;')
        .replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvPrintPos=(modelMatrix*vec4(transformed,1.0)).xyz;\nvPrintNormal=normalize(mat3(modelMatrix)*objectNormal);\nvZone=zone;');
      shader.fragmentShader=shader.fragmentShader
        .replace('#include <common>','#include <common>\nuniform mat4 projector;\nuniform vec3 projDir;\nuniform float zoneGroup;\nvarying vec3 vPrintPos;\nvarying vec3 vPrintNormal;\nvarying float vZone;')
        .replace('#include <map_fragment>',[
          'vec4 pq=projector*vec4(vPrintPos,1.0);',
          'if(any(lessThan(pq.xy,vec2(0.0)))||any(greaterThan(pq.xy,vec2(1.0)))||abs(pq.z)>1.0)discard;',
          'if(dot(normalize(vPrintNormal),projDir)<0.12||abs(vZone-zoneGroup)>0.5)discard;',
          'vec4 sampledDiffuseColor=texture2D(map,pq.xy);',
          'if(sampledDiffuseColor.a<0.02)discard;',
          'diffuseColor*=sampledDiffuseColor;'
        ].join('\n'));
    };
    material.userData.uniforms=uniforms;
    return material;
  }
  const prints=[];  // {mesh, material, texture, canvas, ctx, pixels, key, frame, depth, group}
  function makePrint(i) {
    const canvas=document.createElement('canvas'); canvas.width=600; canvas.height=660;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    const texture=new T.CanvasTexture(canvas); texture.colorSpace=T.SRGBColorSpace;
    texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    const material=printMaterial(texture), mesh=new T.Mesh(tee.geometry,material);
    mesh.renderOrder=2+i; scene.add(mesh);
    return {mesh,material,texture,canvas,ctx,pixels:null,key:'',frame:null,depth:PROJ_DEPTH_FRONT,group:0,place:null};
  }
  function disposePrint(p){scene.remove(p.mesh);p.material.dispose();p.texture.dispose();}
  const placeOf=p=>p.place||{p:[(p.x||0)*UNIT,CHEST_Y-(p.y||0)*UNIT,.06],n:[0,0,1],zone:'front'};

  const controls=new T.OrbitControls(camera,el);
  controls.target.set(0,.36,0); controls.enablePan=false;
  controls.enableDamping=!matchMedia('(prefers-reduced-motion: reduce)').matches;
  controls.dampingFactor=.09; controls.rotateSpeed=.65; controls.zoomSpeed=.65;
  controls.minDistance=1.05; controls.maxDistance=3.4; controls.minPolarAngle=.65; controls.maxPolarAngle=2.35;
  camera.position.set(.12,.46,2.12); controls.update();
  let active=false, visible=true, raf=0;
  function requestRender(){if(active && visible && !document.hidden && !raf)raf=requestAnimationFrame(frame);}
  function frame(){raf=0;if(!active || !visible || document.hidden)return;const moving=controls.update();renderer.render(scene,camera);if(moving)requestRender();}
  controls.addEventListener('change',requestRender);
  function resize(){if(!preview.clientWidth)return;const h=Math.max(160,preview.clientHeight-90);el.style.height=h+'px';renderer.setSize(preview.clientWidth,h,false);camera.aspect=preview.clientWidth/h;camera.updateProjectionMatrix();requestRender();}
  const observer=new ResizeObserver(resize); observer.observe(preview);
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;requestRender();}); intersection.observe(preview);
  document.addEventListener('visibilitychange',requestRender);
  const VIEWS={front:[0,.44,2.12],back:[0,.44,-2.12],detail:[.72,.55,1.25],'sleeve-left':[2.05,.5,.55],'sleeve-right':[-2.05,.5,.55],side:[2.12,.44,0]};
  function lookFrom(view){controls.reset();controls.target.set(0,.36,0);camera.position.set(...(VIEWS[view]||VIEWS.front));controls.update();requestRender();}
  for(const button of tools.el.querySelectorAll('[data-view]'))button.addEventListener('click',()=>lookFrom(button.dataset.view));

  let current=studio.getDesign();
  function applyDesign(d){
    current=d;cloth.color.set(d.garment||(d.color==='white'?'#f2f2ef':'#15161a'));
    cloth.sheenColor.copy(cloth.color);
    const brief=d.mode==='brief', ai=brief?0:d.active;
    const list=brief?[{...(d.prints[d.active]||d.prints[0]||{scale:80}),place:null}]:d.prints;
    while(prints.length>list.length)disposePrint(prints.pop());
    while(prints.length<list.length)prints.push(makePrint(prints.length));
    list.forEach((p,i)=>{
      const print=prints[i], selected=list.length>1 && i===ai;
      const nextKey=JSON.stringify([d.mode,d.brief,p.text,p.font,p.ink,p.image?p.image.length:0,p.rev,selected,d.color]);
      if(nextKey!==print.key){
        print.key=nextKey;const c=print.ctx;c.clearRect(0,0,600,660);c.save();c.translate(300,330);c.scale(2,2);c.translate(-500,-500);studio.drawPrint(c,p,d);c.restore();
        // Borda transparente evita riscos de clamp fora do retângulo; contorno tracejado marca a estampa ativa.
        c.clearRect(0,0,600,2);c.clearRect(0,658,600,2);c.clearRect(0,0,2,660);c.clearRect(598,0,2,660);
        if(selected){c.save();c.strokeStyle='rgba(23,55,188,.75)';c.lineWidth=4;c.setLineDash([16,12]);c.strokeRect(6,6,588,648);c.restore();}
        print.pixels=c.getImageData(0,0,600,660).data;print.texture.needsUpdate=true;
      }
      const place=placeOf(p), frame=printFrame(place,p);
      print.place=place;print.frame=frame;print.depth=p.place?PROJ_DEPTH_PLACE:PROJ_DEPTH_FRONT;print.group=groupOfZone(place.zone);
      const u=print.material.userData.uniforms;
      u.projector.value.fromArray(projectorMatrix(frame,print.depth));u.projDir.value.fromArray(frame.normal);u.zoneGroup.value=print.group;
      print.mesh.renderOrder=2+i;
    });
    tools.sync(d);requestRender();
  }
  const onDesign=e=>applyDesign(e.detail);document.addEventListener('duavesso:design',onDesign);
  applyDesign(current);

  // ---- interação ----
  const raycaster=new T.Raycaster(), ndc=new T.Vector2();
  function hit(e){const r=el.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);raycaster.setFromCamera(ndc,camera);return raycaster.intersectObject(tee,false)[0];}
  const hitNormal=h=>{const n=h.face.normal.clone().transformDirection(tee.matrixWorld);return [n.x,n.y,n.z];};
  // Pegada tolerante: basta um pixel opaco perto do ponto (letras finas e vãos entre letras não escapam).
  function opaqueNear(pixels,uv){
    const cx=Math.floor(uv.x*600), cy=Math.floor((1-uv.y)*660);
    for(let dy=-14;dy<=14;dy+=7)for(let dx=-14;dx<=14;dx+=7){const x=cx+dx,y=cy+dy;if(x<0||y<0||x>=600||y>=660)continue;if(pixels[(y*600+x)*4+3]>20)return true;}
    return false;
  }
  // Índice da estampa sob o ponto atingido (a mais acima primeiro), testando a transparência da arte.
  function printAt(h){
    if(!h)return -1;
    const point=[h.point.x,h.point.y,h.point.z], normal=hitNormal(h), group=groupOfZone(zoneOf(point,normal,halfWidth));
    for(let i=prints.length-1;i>=0;i--){
      const print=prints[i];if(!print.frame || !print.pixels || print.group!==group)continue;
      const uv=frameUV(print.frame,point);
      if(uv.x<=0 || uv.x>=1 || uv.y<=0 || uv.y>=1 || Math.abs(uv.depth)>print.depth)continue;
      const n=print.frame.normal;if(normal[0]*n[0]+normal[1]*n[1]+normal[2]*n[2]<.12)continue;
      if(opaqueNear(print.pixels,uv))return i;
    }
    return -1;
  }
  // Grava um novo lugar: na frente e dentro da faixa dos sliders vira (x, y); senão fica como `place`.
  function commitPlace(i,place){
    const slider=sliderPosition(place);
    studio.updatePrint(i,slider?{x:slider.x,y:slider.y,place:null}:{place});
  }
  let drag=null, pending=null, pendingRaf=0;
  el.style.touchAction='none';
  el.addEventListener('pointerdown',e=>{
    if(drag || (e.pointerType==='mouse' && e.button!==0))return;
    const h=hit(e), i=printAt(h);if(i<0)return;
    e.stopImmediatePropagation();e.preventDefault();el.focus({preventScroll:true});
    if(i!==current.active)studio.selectPrint(i);
    const uv=frameUV(prints[i].frame,[h.point.x,h.point.y,h.point.z]);
    drag={id:e.pointerId,index:i,grab:{u:uv.x-.5,v:uv.y-.5}};
    controls.enabled=false;el.setPointerCapture(e.pointerId);el.classList.add('is-drag');
  },{capture:true});
  el.addEventListener('pointermove',e=>{
    const h=hit(e);
    if(drag){
      if(e.pointerId!==drag.id || !h)return;
      const p=current.prints[drag.index];if(!p)return;
      pending=dragPlace([h.point.x,h.point.y,h.point.z],hitNormal(h),drag.grab,p,halfWidth);
      if(!pendingRaf)pendingRaf=requestAnimationFrame(()=>{pendingRaf=0;if(drag && pending)commitPlace(drag.index,pending);});
    }else el.classList.toggle('is-over',printAt(h)>=0);
  });
  const release=e=>{if(!drag || e.pointerId!==drag.id)return;const index=drag.index;drag=null;controls.enabled=true;el.classList.remove('is-drag');if(el.hasPointerCapture(e.pointerId))el.releasePointerCapture(e.pointerId);if(pending){commitPlace(index,pending);pending=null;}};
  el.addEventListener('pointerup',release);el.addEventListener('pointercancel',release);el.addEventListener('lostpointercapture',release);
  el.addEventListener('wheel',e=>{
    const i=printAt(hit(e));if(i<0)return;e.preventDefault();e.stopImmediatePropagation();
    const p=current.prints[i];studio.updatePrint(i,{scale:Math.max(45,Math.min(100,p.scale-Math.sign(e.deltaY)*3))});
  },{capture:true,passive:false});
  el.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
    e.preventDefault();
    if(e.shiftKey){
      const idx=current.mode==='brief'?0:current.active, p=current.prints[idx];if(!p)return;
      const horizontal=e.key==='ArrowLeft'||e.key==='ArrowRight', step=['ArrowLeft','ArrowUp'].includes(e.key)?-1:1;
      if(current.mode!=='brief' && p.place){const f=printFrame(p.place,p), axis=horizontal?f.right:f.up, s=step*UNIT*(horizontal?1:-1);
        studio.updatePrint(idx,{place:{...p.place,p:p.place.p.map((v,k)=>v+axis[k]*s)}});}
      else studio.updatePrint(idx,horizontal?{x:Math.max(-30,Math.min(30,(p.x||0)+step)),place:null}:{y:Math.max(-25,Math.min(25,(p.y||0)+step)),place:null});
    }
    else {const off=camera.position.clone().sub(controls.target).applyAxisAngle(new T.Vector3(0,1,0),e.key==='ArrowLeft' || e.key==='ArrowUp'?-.18:.18);camera.position.copy(controls.target).add(off);controls.update();requestRender();}
  });
  // Botões de zona: levam a estampa selecionada para o centro da zona e viram a câmera para lá.
  const ANCHORS={front:[[0,CHEST_Y,2],[0,0,-1]],back:[[0,CHEST_Y,-2],[0,0,1]],'sleeve-left':[[2,.55,.03],[-1,0,0]],'sleeve-right':[[-2,.55,.03],[1,0,0]]};
  for(const button of tools.el.querySelectorAll('[data-zone]'))button.addEventListener('click',()=>{
    if(current.mode==='brief')return;
    const zone=button.dataset.zone, i=current.active, [o,dir]=ANCHORS[zone];
    if(zone==='front'){studio.updatePrint(i,{x:0,y:0,place:null});lookFrom('front');return;}
    raycaster.set(new T.Vector3(...o),new T.Vector3(...dir));
    const h=raycaster.intersectObject(tee,false)[0];if(!h)return;
    const n=zone==='sleeve-left'?[.88,0,.47]:zone==='sleeve-right'?[-.88,0,.47]:hitNormal(h);
    studio.updatePrint(i,{place:{p:[h.point.x,h.point.y,h.point.z],n,zone}});lookFrom(zone);
  });

  // Prévia determinística para download e sacola: frente e, se houver estampa fora dela, as outras vistas.
  function snapshot(d=current){
    const views=['front'];
    const zones=new Set((d.prints||[]).filter(p=>p.text?.trim()||p.image).map(p=>p.place?.zone||'front'));
    if(zones.has('back') || zones.has('side'))views.push('back');
    if(zones.has('sleeve-left'))views.push('sleeve-left');
    if(zones.has('sleeve-right'))views.push('sleeve-right');
    const size=renderer.getSize(new T.Vector2()), ratio=renderer.getPixelRatio(), saved=camera.clone(), before=current;
    const SNAP={front:[0,.44,2.05],back:[0,.44,-2.05],'sleeve-left':[2.05,.5,.55],'sleeve-right':[-2.05,.5,.55]};
    const out=document.createElement('canvas');out.width=out.height=1000;
    const ctx=out.getContext('2d');ctx.fillStyle='#edeef0';ctx.fillRect(0,0,1000,1000);
    try {
      applyDesign({...d,active:-1});
      const cell=views.length>1?500:1000, cols=views.length>1?2:1;
      renderer.setPixelRatio(1);renderer.setSize(cell,cell,false);camera.aspect=1;camera.updateProjectionMatrix();
      views.forEach((view,k)=>{
        camera.position.set(...SNAP[view]);camera.lookAt(0,.36,0);renderer.render(scene,camera);
        const row=Math.floor(k/cols), col=k%cols, offsetY=views.length===2?250:0;
        ctx.drawImage(el,col*cell,offsetY+row*cell,cell,cell);
      });
      if(views.length>1){ctx.font='700 26px Manrope, Arial, sans-serif';ctx.fillStyle='rgba(22,23,25,.75)';ctx.textAlign='center';views.forEach((view,k)=>{const col=k%cols,row=Math.floor(k/cols),offsetY=views.length===2?250:0;ctx.fillText((view==='front'?'Frente':view==='back'?'Costas':ZONE_LABEL[view]).toUpperCase(),col*cell+cell/2,offsetY+row*cell+cell-14);});}
      return out;
    } finally {applyDesign(before);camera.copy(saved);renderer.setPixelRatio(ratio);renderer.setSize(size.x,size.y,false);requestRender();}
  }
  studio.capturePreview=snapshot;
  studio.is3DActive=()=>active;
  preview.appendChild(el);preview.appendChild(tools.el);
  return {setActive(on){active=on;el.hidden=!on;preview.classList.toggle('has-3d',on);if(on){resize();requestRender();}else{cancelAnimationFrame(raf);raf=0;}},snapshot};
}

function setup(){
  const button=document.createElement('button');button.type='button';button.className='text-button';button.id='toggle-3d';
  button.textContent='Ver em 3D ↻';button.setAttribute('aria-pressed','false');footer.insertBefore(button,footer.lastElementChild);
  const tools=buildTools(),label=footer.querySelector('span'),label2d=label.textContent;
  let view=null,active=false,loading=null;
  const load=()=>loading||=createView(tools).catch(error=>{loading=null;throw error;});
  window.duavessoStudio.ensure3D=async()=>{view=view||await load();return true;};
  button.addEventListener('click',async()=>{
    if(!view){button.disabled=true;button.textContent='Carregando camiseta…';try{view=await load();}catch(error){console.error(error);button.textContent='Tentar carregar 3D novamente';return;}finally{button.disabled=false;}}
    active=!active;view.setActive(active);tools.el.hidden=!active;
    canvas2d.style.visibility=active?'hidden':'';
    if(!active && $('#design-garment').value)canvas2d.getContext('2d').drawImage(view.snapshot(),0,0,1000,1000);
    button.textContent=active?'Voltar à prévia 2D':'Ver em 3D ↻';button.setAttribute('aria-pressed',String(active));
    label.textContent=active?'FRENTE, COSTAS E MANGAS · PRÉVIA 3D':label2d;
  });
}
if(preview && footer && canvas2d && form)setup();
