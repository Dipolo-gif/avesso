// Prévia 3D do estúdio (Three.js). O botão "Ver em 3D" carrega vendor/three.js e o modelo
// assets/tee.glb só quando clicado. A camiseta é um modelo de verdade: simulação de tecido feita
// no Blender (painéis frente/costas costurados, manequim invisível, mangas em tubo, gola canelada,
// caimento com dobras). A estampa desenhada pelo app.js (window.doavessoStudio.drawPrint) vira um
// decalque projetado no tecido, que a pessoa arrasta direto na peça; a cor da peça é livre.
const preview = document.getElementById('design-preview');
const footer = document.querySelector('.preview-footer');
const canvas2d = document.getElementById('design-canvas');
const form = document.getElementById('design-form');

function supportsWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const $ = (s, r = document) => r.querySelector(s);
// Cores prontas da peça. As duas primeiras são as bases do catálogo (fotos da prévia 2D);
// as outras (e o seletor livre) viram "cor personalizada" no pedido.
const SWATCHES = [
  ['Branco giz', '#f2f2ef', 'white'], ['Preto lavado', '#15161a', 'black'],
  ['Off-white', '#e9e4d8'], ['Cinza mescla', '#9a9da3'], ['Azul doavesso', '#1737bc'],
  ['Verde musgo', '#4c5a3f'], ['Vinho', '#6b2233'], ['Areia', '#cdb79a']
];
const luminance = hex => { const n = parseInt(hex.slice(1), 16); return 0.2126 * (n >> 16 & 255) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255); };

function setup() {
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'text-button'; button.id = 'toggle-3d'; button.textContent = 'Ver em 3D ↻';
  button.setAttribute('aria-pressed', 'false');
  footer.insertBefore(button, footer.lastElementChild);
  const label = footer.querySelector('span');
  const label2d = label.textContent;
  const tools = buildTools();
  preview.appendChild(tools.el);
  let view = null, active = false;

  button.addEventListener('click', async () => {
    if (!view) {
      button.disabled = true; button.textContent = 'Carregando 3D…';
      try { view = await createView(tools); }
      catch (err) { console.error(err); button.textContent = '3D indisponível'; return; }
      finally { button.disabled = false; }
    }
    active = !active;
    view.setActive(active);
    tools.el.hidden = !active;
    canvas2d.style.visibility = active ? 'hidden' : '';
    button.textContent = active ? 'Voltar à prévia 2D' : 'Ver em 3D ↻';
    button.setAttribute('aria-pressed', String(active));
    label.textContent = active ? 'PRÉVIA 3D · ARRASTE A ESTAMPA OU GIRE A PEÇA' : label2d;
  });
}

// Barra de cor da peça (aparece sobre a prévia 3D). Escolher uma cor grava #design-garment e
// ajusta a base clara/escura do catálogo (#design-color) pela luminância, para preço e prévia 2D.
function buildTools() {
  const el = document.createElement('div'); el.className = 'tee-tools'; el.hidden = true;
  el.innerHTML = '<span class="tee-tools-label">Cor da peça</span><div class="tee-swatches" role="group" aria-label="Cor da camiseta"></div><label class="tee-custom">Outra <input type="color" value="#1737bc" aria-label="Escolher outra cor da camiseta"></label><span class="tee-hint">Arraste a estampa pela camiseta · roda do mouse sobre ela muda o tamanho · arraste fora dela para girar a peça</span>';
  const row = $('.tee-swatches', el), custom = $('input[type=color]', el);
  for (const [name, hex, base] of SWATCHES) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tee-swatch'; b.title = name; b.setAttribute('aria-label', name);
    b.style.background = hex; b.dataset.hex = hex; if (base) b.dataset.base = base;
    b.addEventListener('click', () => setGarment(hex, base));
    row.appendChild(b);
  }
  custom.addEventListener('input', e => setGarment(e.target.value, ''));
  function setGarment(hex, base) {
    const garment = $('#design-garment'), color = $('#design-color');
    if (base) { garment.value = ''; color.value = base; }
    else { garment.value = hex.toLowerCase(); color.value = luminance(hex) > 118 ? 'white' : 'black'; }
    form.dispatchEvent(new Event('input', {bubbles: true}));
  }
  function sync(d) {
    const hex = (d.garment || (d.color === 'white' ? '#f2f2ef' : '#15161a')).toLowerCase();
    for (const b of row.children) b.setAttribute('aria-pressed', String(b.dataset.hex === hex && !!b.dataset.base === !d.garment));
    if (d.garment) custom.value = d.garment;
  }
  return {el, sync};
}

// Mapa de normais de tecido gerado em canvas: trama (fios cruzados) ou canelado (listras da gola).
function makeFabricNormal(T, repeat, rib) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), img = g.createImageData(S, S), d = img.data;
  const h = (x, y) => {
    if (rib) return Math.sin(x / S * Math.PI * 2 * 48) * 0.9;
    const weave = Math.sin(x / S * Math.PI * 2 * 26) * 0.5 + Math.sin(y / S * Math.PI * 2 * 26 + 1.6) * 0.5;
    const grain = Math.sin(x * 12.9898 + y * 78.233) * 0.5;
    return weave * 0.7 + (grain - Math.floor(grain)) * 0.25;
  };
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const hl = h((x + S - 1) % S, y), hr = h((x + 1) % S, y), hu = h(x, (y + S - 1) % S), hd = h(x, (y + 1) % S);
    const nx = hl - hr, ny = hu - hd, nz = 1, len = Math.hypot(nx, ny, nz), i = (y * S + x) * 4;
    d[i] = (nx / len * 0.5 + 0.5) * 255; d[i + 1] = (ny / len * 0.5 + 0.5) * 255; d[i + 2] = (nz / len * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const tex = new T.CanvasTexture(c); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(repeat, repeat); tex.anisotropy = 4;
  return tex;
}

// Sombra de contato: disco com gradiente radial, ancora a peça no "chão".
function makeShadow(T) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), grd = g.createRadialGradient(S / 2, S / 2, S * 0.04, S / 2, S / 2, S / 2);
  grd.addColorStop(0, 'rgba(22,23,25,0.5)'); grd.addColorStop(0.5, 'rgba(22,23,25,0.2)'); grd.addColorStop(1, 'rgba(22,23,25,0)');
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}

async function createView(tools) {
  const T = await import('./vendor/three.js');
  const studio = window.doavessoStudio;
  await studio.ready();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Palco -------------------------------------------------------------------
  const el = document.createElement('canvas');
  el.className = 'preview-3d'; el.setAttribute('role', 'img');
  el.setAttribute('aria-label', 'Prévia 3D da sua camiseta. Arraste a estampa para posicionar; arraste fora dela para girar a peça.');
  el.hidden = true; el.tabIndex = 0;
  preview.appendChild(el); preview.appendChild(tools.el); // barra de cores por cima do canvas
  const renderer = new T.WebGLRenderer({canvas: el, antialias: true, alpha: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = T.NeutralToneMapping; renderer.toneMappingExposure = 1.0; // Khronos PBR Neutral: cor fiel (e-commerce)
  const scene = new T.Scene();
  scene.environment = new T.PMREMGenerator(renderer).fromScene(new T.RoomEnvironment(), 0.04).texture;
  scene.add(new T.HemisphereLight(0xffffff, 0xcfd2d8, 0.3));
  const key = new T.DirectionalLight(0xffffff, 1.05); key.position.set(-1.2, 2.2, 2.4); scene.add(key);
  const fill = new T.DirectionalLight(0xe9eeff, 0.3); fill.position.set(1.8, 0.6, 1.2); scene.add(fill);
  const rim = new T.DirectionalLight(0xffffff, 0.55); rim.position.set(0.6, 1.4, -2.2); scene.add(rim);
  const camera = new T.PerspectiveCamera(27, 1, 0.05, 20);
  camera.position.set(0.16, 0.5, 1.78);

  // Giro fluido: OrbitControls com inércia; gira sozinho devagar quando ninguém mexe.
  const controls = new T.OrbitControls(camera, el);
  controls.target.set(0, 0.395, 0);
  controls.enableDamping = true; controls.dampingFactor = 0.07; controls.enablePan = false;
  controls.minDistance = 1.05; controls.maxDistance = 3.0; controls.minPolarAngle = 0.85; controls.maxPolarAngle = 1.9;
  controls.rotateSpeed = 0.85; controls.zoomSpeed = 0.7;
  controls.autoRotate = !reduced; controls.autoRotateSpeed = 0.55; controls.update();
  let idle = 0;
  controls.addEventListener('start', () => { controls.autoRotate = false; clearTimeout(idle); });
  controls.addEventListener('end', () => { clearTimeout(idle); if (!reduced) idle = setTimeout(() => { controls.autoRotate = true; }, 4000); });

  // Modelo -------------------------------------------------------------------
  const gltf = await new T.GLTFLoader().loadAsync('assets/tee.glb');
  let tee = null, collar = null;
  gltf.scene.traverse(o => { if (!o.isMesh) return; if (o.name.startsWith('Tee')) tee = o; else if (o.name.startsWith('Collar')) collar = o; });
  if (!tee) throw new Error('assets/tee.glb sem a malha "Tee"');
  const rig = new T.Group(); scene.add(rig);
  rig.add(tee); if (collar) rig.add(collar);
  const box = new T.Box3().setFromObject(rig), c = box.getCenter(new T.Vector3());
  rig.position.set(-c.x, 0.36 - c.y, -c.z); rig.updateMatrixWorld(true);

  const weave = makeFabricNormal(T, 14, false);
  const cloth = new T.MeshPhysicalMaterial({
    color: 0xf2f2ef, roughness: 0.88, metalness: 0,
    sheen: 0.18, sheenRoughness: 0.9, sheenColor: new T.Color(0xffffff),
    normalMap: weave, normalScale: new T.Vector2(0.32, 0.32), envMapIntensity: 0.35, side: T.DoubleSide
  });
  tee.material = cloth;
  const rib = new T.MeshPhysicalMaterial({color: 0xe9e9e4, roughness: 0.8, metalness: 0, sheen: 0.25, sheenRoughness: 0.8, normalMap: makeFabricNormal(T, 6, true), normalScale: new T.Vector2(0.5, 0.5), envMapIntensity: 0.35});
  if (collar) collar.material = rib;

  const shadow = new T.Mesh(new T.CircleGeometry(0.46, 48), new T.MeshBasicMaterial({map: makeShadow(T), transparent: true, depthWrite: false}));
  shadow.rotation.x = -Math.PI / 2; shadow.scale.set(1, 0.55, 1);
  shadow.position.y = box.min.y + rig.position.y - 0.004; scene.add(shadow);

  // Estampa: decalque projetado no tecido ---------------------------------------
  const texCanvas = document.createElement('canvas'); texCanvas.width = 600; texCanvas.height = 660;
  const tctx = texCanvas.getContext('2d');
  const texture = new T.CanvasTexture(texCanvas); texture.colorSpace = T.SRGBColorSpace; texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const decalNormal = weave.clone(); decalNormal.repeat.set(4, 4.4); decalNormal.needsUpdate = true;
  const decalMaterial = new T.MeshStandardMaterial({map: texture, transparent: true, depthTest: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, roughness: 0.9, metalness: 0, normalMap: decalNormal, normalScale: new T.Vector2(0.2, 0.2), envMapIntensity: 0.25});
  const decal = new T.Mesh(new T.PlaneGeometry(0.001, 0.001), decalMaterial); decal.renderOrder = 2; decal.visible = false; scene.add(decal);
  const raycaster = new T.Raycaster(), helper = new T.Object3D(), ndc = new T.Vector2();
  // Sliders ↔ peça: 1 unidade = 3,3 px na prévia 2D ≈ 3,4 mm no tecido; centro do peito a 0,44 m.
  const CHEST_Y = 0.44, K = 0.0034;
  let current = studio.getDesign(), dragging = false;

  const worldNormal = h => h.face.normal.clone().transformDirection(h.object.matrixWorld);
  const pickFront = hits => { for (const h of hits) if (worldNormal(h).z > 0.12) return h; return null; };
  function frontHit(x, y) { raycaster.set(new T.Vector3(x, y, 2), new T.Vector3(0, 0, -1)); return pickFront(raycaster.intersectObject(tee, false)); }
  function buildDecal(hit, d) {
    helper.position.copy(hit.point); helper.lookAt(hit.point.clone().add(worldNormal(hit)));
    helper.rotateZ(-d.rotation * Math.PI / 180);
    const s = d.scale / 100;
    const geometry = new T.DecalGeometry(tee, hit.point, helper.rotation, new T.Vector3(0.30 * s, 0.33 * s, 0.14));
    decal.geometry.dispose(); decal.geometry = geometry; decal.visible = true;
  }
  function placeFromDesign(d) { const hit = frontHit(d.x * K, CHEST_Y - d.y * K); if (hit) buildDecal(hit, d); }
  function drawTexture(d) {
    tctx.clearRect(0, 0, 600, 660); tctx.save(); tctx.translate(300, 330); tctx.scale(2, 2); tctx.translate(-500, -500); studio.drawPrint(tctx, d); tctx.restore();
    texture.needsUpdate = true;
  }
  function applyDesign(d) {
    current = d;
    cloth.color.set(d.garment || (d.color === 'white' ? '#f2f2ef' : '#15161a'));
    cloth.sheenColor.copy(cloth.color).lerp(new T.Color(0xffffff), 0.35); rib.sheenColor.copy(cloth.sheenColor);
    rib.color.copy(cloth.color).multiplyScalar(0.94);
    drawTexture(d);
    if (!dragging) placeFromDesign(d);
    tools.sync(d);
  }

  // Arrastar a estampa direto na peça (fora dela, o arraste gira a camiseta) -------------
  const pointerRay = e => { const r = el.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); raycaster.setFromCamera(ndc, camera); };
  const overDecal = e => { if (!decal.visible) return false; pointerRay(e); return raycaster.intersectObject(decal, false).length > 0; };
  const syncForm = () => form.dispatchEvent(new Event('input', {bubbles: true}));
  let raf = 0, over = false;
  el.style.touchAction = 'none';
  el.addEventListener('pointerdown', e => {
    if ((e.pointerType === 'mouse' && e.button !== 0) || !overDecal(e)) return;
    e.stopImmediatePropagation(); e.preventDefault();
    dragging = true; controls.enabled = false; el.setPointerCapture(e.pointerId); el.classList.add('is-drag');
  }, {capture: true});
  el.addEventListener('pointermove', e => {
    if (dragging) {
      pointerRay(e);
      const hit = pickFront(raycaster.intersectObject(tee, false)); if (!hit) return;
      const x = Math.max(-30, Math.min(30, Math.round(hit.point.x / K))), y = Math.max(-25, Math.min(25, Math.round((CHEST_Y - hit.point.y) / K)));
      buildDecal(hit, {...current, x, y});
      if (x !== current.x || y !== current.y) { current = {...current, x, y}; $('#design-x').value = x; $('#design-y').value = y; cancelAnimationFrame(raf); raf = requestAnimationFrame(syncForm); }
      return;
    }
    const o = overDecal(e);
    if (o !== over) { over = o; el.classList.toggle('is-over', o); controls.enableZoom = !o; }
  });
  const release = e => { if (!dragging) return; dragging = false; controls.enabled = true; el.classList.remove('is-drag'); try { el.releasePointerCapture(e.pointerId); } catch {} placeFromDesign(current); };
  el.addEventListener('pointerup', release); el.addEventListener('pointercancel', release);
  // Roda do mouse sobre a estampa: tamanho (fora dela, zoom da câmera).
  el.addEventListener('wheel', e => {
    if (!overDecal(e)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const input = $('#design-scale'); input.value = Math.max(45, Math.min(100, Number(input.value) - Math.sign(e.deltaY) * 3)); syncForm();
  }, {capture: true, passive: false});
  el.addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const off = camera.position.clone().sub(controls.target).applyAxisAngle(new T.Vector3(0, 1, 0), e.key === 'ArrowLeft' ? -0.25 : 0.25);
    camera.position.copy(controls.target).add(off); controls.update(); render(); e.preventDefault();
  });

  let running = false;
  function render() { renderer.render(scene, camera); }
  function frame() { if (!running) return; controls.update(); render(); requestAnimationFrame(frame); }
  function resize() { const w = preview.clientWidth, h = preview.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); render(); }
  new ResizeObserver(resize).observe(preview);
  applyDesign(current);
  document.addEventListener('doavesso:design', e => { applyDesign(e.detail); if (!running) render(); });

  return { setActive(on) { el.hidden = !on; running = on; if (on) { resize(); requestAnimationFrame(frame); } } };
}

if (preview && footer && canvas2d && form && supportsWebGL()) setup();
