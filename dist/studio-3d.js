// Lazy-loaded garment editor. Model provenance: assets/tee-LICENSE.txt.
import {CHEST_Y, UNIT, printTransform, printUV, dragPosition} from './studio-placement.js';
const $ = (s,r=document) => r.querySelector(s);
const preview = $('#design-preview'), footer = $('.preview-footer');
const canvas2d = $('#design-canvas'), form = $('#design-form');
const SWATCHES = [
  ['Branco giz','#f2f2ef','white'], ['Preto lavado','#15161a','black'],
  ['Off-white','#e9e4d8'], ['Cinza','#9a9da3'], ['Azul doavesso','#1737bc'],
  ['Verde musgo','#4c5a3f'], ['Vinho','#6b2233'], ['Areia','#cdb79a']
];
const syncForm = () => form.dispatchEvent(new Event('input',{bubbles:true}));

function buildTools() {
  const el=document.createElement('div'); el.className='tee-tools'; el.hidden=true;
  el.innerHTML='<div class="tee-camera" role="group" aria-label="Vista da camiseta"><button type="button" data-view="front">Frente</button><button type="button" data-view="back">Costas</button><button type="button" data-view="detail">Detalhes</button></div><span class="tee-tools-label">Cor da peça</span><div class="tee-swatches" role="group" aria-label="Cor da camiseta"></div><label class="tee-custom">Outra <input type="color" value="#1737bc" aria-label="Escolher outra cor da camiseta"></label><span class="tee-hint">Puxe a estampa para mover · arraste o tecido para girar · use dois dedos para aproximar</span>';
  const row=$('.tee-swatches',el), custom=$('input',el);
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

async function createView(tools) {
  const T=await import('./vendor/three.js'), studio=window.doavessoStudio;
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
  el.setAttribute('aria-label','Camiseta 3D. Arraste a estampa para mover e o tecido para girar. Setas giram a peça; Shift e setas movem a estampa.');
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
  scene.add(tee); tee.updateMatrixWorld(true);
  const weave=fabricNormal(T); ao.flipY=false;
  const cloth=new T.MeshPhysicalMaterial({color:0xf2f2ef,metalness:0,roughness:.94,
    sheen:.14,sheenRoughness:1,envMapIntensity:.45,side:T.DoubleSide,
    normalMap:weave,normalScale:new T.Vector2(.08,.08),aoMap:ao,aoMapIntensity:.8});
  tee.material.dispose(); tee.material=cloth;

  // Static front surface shares the garment's positions/normals. Moving a print only
  // changes its UV transform: no remeshing or triangle allocation during a drag.
  const front=tee.geometry.clone(), positions=front.attributes.position, normals=front.attributes.normal;
  const index=front.index, frontIndices=[], planar=new Float32Array(positions.count*2);
  for(let i=0;i<positions.count;i++){planar[i*2]=positions.getX(i);planar[i*2+1]=positions.getY(i);}
  for(let i=0;i<index.count;i+=3) {
    const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)];
    if(ids.every(k=>normals.getZ(k)>.12 && positions.getY(k)<.61 && positions.getY(k)>.04))frontIndices.push(...ids);
  }
  front.setIndex(frontIndices); front.setAttribute('uv1',front.attributes.uv.clone());
  front.setAttribute('uv',new T.BufferAttribute(planar,2));
  const texCanvas=document.createElement('canvas'); texCanvas.width=600; texCanvas.height=660;
  const tctx=texCanvas.getContext('2d',{willReadFrequently:true});
  const texture=new T.CanvasTexture(texCanvas); texture.colorSpace=T.SRGBColorSpace;
  texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy()); texture.matrixAutoUpdate=false;
  const printNormal=weave.clone(); printNormal.channel=1;
  const printAO=ao.clone(); printAO.channel=1;
  const printMaterial=new T.MeshStandardMaterial({map:texture,transparent:true,depthWrite:false,
    polygonOffset:true,polygonOffsetFactor:-2,roughness:.94,metalness:0,envMapIntensity:.45,
    normalMap:printNormal,normalScale:new T.Vector2(.08,.08),aoMap:printAO,aoMapIntensity:.8});
  // Discard projected UVs outside the artwork. Texture clamping alone can stretch
  // edge pixels into lines across the sleeves, especially in minified image uploads.
  printMaterial.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',
    'if (any(lessThan(vMapUv, vec2(0.0))) || any(greaterThan(vMapUv, vec2(1.0)))) discard;\n#include <map_fragment>');};
  const print=new T.Mesh(front,printMaterial); print.renderOrder=2; scene.add(print);

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
  for(const button of tools.el.querySelectorAll('[data-view]'))button.addEventListener('click',()=>{
    controls.reset(); controls.target.set(0,.36,0);
    camera.position.set(...(button.dataset.view==='back'?[0,.44,-2.12]:button.dataset.view==='detail'?[.72,.55,1.25]:[0,.44,2.12]));
    controls.update();requestRender();
  });
  let current=studio.getDesign(), textureKey='', pixels=null;
  function applyDesign(d){
    current=d;cloth.color.set(d.garment||(d.color==='white'?'#f2f2ef':'#15161a'));
    cloth.sheenColor.copy(cloth.color);
    const nextKey=JSON.stringify([d.mode,d.text,d.font,d.ink,d.brief,studio.artworkVersion?.()]);
    if(nextKey!==textureKey){
      textureKey=nextKey;tctx.clearRect(0,0,600,660);tctx.save();tctx.translate(300,330);tctx.scale(2,2);tctx.translate(-500,-500);studio.drawPrint(tctx,d);tctx.restore();
      // Transparent border prevents clamp-to-edge streaks outside the print rectangle.
      tctx.clearRect(0,0,600,2);tctx.clearRect(0,658,600,2);tctx.clearRect(0,0,2,660);tctx.clearRect(598,0,2,660);
      pixels=tctx.getImageData(0,0,600,660).data;texture.needsUpdate=true;
    }
    const [a,b,x,c,e,y]=printTransform(d);texture.matrix.set(a,b,x,c,e,y,0,0,1);
    tools.sync(d);requestRender();
  }
  const onDesign=e=>applyDesign(e.detail);document.addEventListener('doavesso:design',onDesign);
  applyDesign(current);

  const raycaster=new T.Raycaster(), ndc=new T.Vector2();
  function hit(e){const r=el.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);raycaster.setFromCamera(ndc,camera);return raycaster.intersectObject(tee,false)[0];}
  function isPrint(h){
    if(!h || h.face.normal.z<=.12 || !pixels)return false;
    const uv=printUV(h.point,current);if(uv.x<=0 || uv.x>=1 || uv.y<=0 || uv.y>=1)return false;
    return pixels[(Math.floor((1-uv.y)*660)*600+Math.floor(uv.x*600))*4+3]>20;
  }
  let drag=null;
  el.style.touchAction='none';
  el.addEventListener('pointerdown',e=>{
    if(drag || (e.pointerType==='mouse' && e.button!==0))return;
    const h=hit(e);if(!isPrint(h))return;
    e.stopImmediatePropagation();e.preventDefault();el.focus({preventScroll:true});
    drag={id:e.pointerId,offset:{x:h.point.x-(current.x||0)*UNIT,y:h.point.y-(CHEST_Y-(current.y||0)*UNIT)}};
    controls.enabled=false;el.setPointerCapture(e.pointerId);el.classList.add('is-drag');
  },{capture:true});
  el.addEventListener('pointermove',e=>{
    const h=hit(e);
    if(drag){
      if(e.pointerId!==drag.id || !h || h.face.normal.z<=.12)return;
      const next=dragPosition(h.point,drag.offset);
      if(next.x!==current.x || next.y!==current.y){$('#design-x').value=next.x;$('#design-y').value=next.y;syncForm();}
    }else el.classList.toggle('is-over',isPrint(h));
  });
  const release=e=>{if(!drag || e.pointerId!==drag.id)return;drag=null;controls.enabled=true;el.classList.remove('is-drag');if(el.hasPointerCapture(e.pointerId))el.releasePointerCapture(e.pointerId);};
  el.addEventListener('pointerup',release);el.addEventListener('pointercancel',release);el.addEventListener('lostpointercapture',release);
  el.addEventListener('wheel',e=>{
    if(!isPrint(hit(e)))return;e.preventDefault();e.stopImmediatePropagation();
    $('#design-scale').value=Math.max(45,Math.min(100,current.scale-Math.sign(e.deltaY)*3));syncForm();
  },{capture:true,passive:false});
  el.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
    e.preventDefault();
    if(e.shiftKey){const horizontal=e.key==='ArrowLeft'||e.key==='ArrowRight',id=horizontal?'#design-x':'#design-y',input=$(id);input.value=Number(input.value)+(['ArrowLeft','ArrowUp'].includes(e.key)?-1:1);syncForm();}
    else {const off=camera.position.clone().sub(controls.target).applyAxisAngle(new T.Vector3(0,1,0),e.key==='ArrowLeft' || e.key==='ArrowUp'?-.18:.18);camera.position.copy(controls.target).add(off);controls.update();requestRender();}
  });

  // Deterministic front image for downloads and cart, independent of orbit/zoom.
  function snapshot(){
    const size=renderer.getSize(new T.Vector2()), ratio=renderer.getPixelRatio(), saved=camera.clone();
    const out=document.createElement('canvas');out.width=out.height=1000;
    try {
      camera.position.set(0,.44,2.05);camera.lookAt(0,.36,0);camera.aspect=1;camera.updateProjectionMatrix();
      renderer.setPixelRatio(1);renderer.setSize(1000,1000,false);renderer.render(scene,camera);
      const ctx=out.getContext('2d');ctx.fillStyle='#edeef0';ctx.fillRect(0,0,1000,1000);ctx.drawImage(el,0,0);
      return out;
    } finally {camera.copy(saved);renderer.setPixelRatio(ratio);renderer.setSize(size.x,size.y,false);requestRender();}
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
  let view=null,active=false;
  button.addEventListener('click',async()=>{
    if(!view){button.disabled=true;button.textContent='Carregando camiseta…';try{view=await createView(tools);}catch(error){console.error(error);button.textContent='Tentar carregar 3D novamente';return;}finally{button.disabled=false;}}
    active=!active;view.setActive(active);tools.el.hidden=!active;
    canvas2d.style.visibility=active?'hidden':'';
    if(!active && $('#design-garment').value)canvas2d.getContext('2d').drawImage(view.snapshot(),0,0,1000,1000);
    button.textContent=active?'Voltar à prévia 2D':'Ver em 3D ↻';button.setAttribute('aria-pressed',String(active));
    label.textContent=active?'FRENTE E COSTAS · PRÉVIA 3D':label2d;
  });
}
if(preview && footer && canvas2d && form)setup();
