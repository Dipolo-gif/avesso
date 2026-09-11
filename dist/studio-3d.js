// Prévia 3D do estúdio (Three.js). Opcional: o botão "Ver em 3D" carrega vendor/three.js
// só quando clicado. A camiseta é construída aqui (silhueta oversized com volume e dobras
// de tecido) e a estampa desenhada pelo app.js (window.doavessoStudio.drawPrint) vira textura.
const preview = document.getElementById('design-preview');
const footer = document.querySelector('.preview-footer');
const canvas2d = document.getElementById('design-canvas');
if (preview && footer && canvas2d && supportsWebGL()) setup();

function supportsWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

function setup() {
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'text-button'; button.id = 'toggle-3d'; button.textContent = 'Ver em 3D ↻';
  button.setAttribute('aria-pressed', 'false');
  footer.insertBefore(button, footer.lastElementChild);
  const label = footer.querySelector('span');
  const label2d = label.textContent;
  let view = null, active = false;

  button.addEventListener('click', async () => {
    if (!view) {
      button.disabled = true; button.textContent = 'Carregando 3D…';
      try { view = await createView(); }
      catch (err) { console.error(err); button.textContent = '3D indisponível'; return; }
      finally { button.disabled = false; }
    }
    active = !active;
    view.setActive(active);
    canvas2d.style.visibility = active ? 'hidden' : '';
    button.textContent = active ? 'Voltar à prévia 2D' : 'Ver em 3D ↻';
    button.setAttribute('aria-pressed', String(active));
    label.textContent = active ? 'FRENTE E COSTAS · ARRASTE PARA GIRAR' : label2d;
  });
}

// Mapa de normais de tecido: trama fina (repetida) + micro-ondulações. É o que dá cara de
// pano em vez de plástico. Gerado uma vez, em canvas, e convertido de altura para normal.
function makeFabricNormal(T) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), img = g.createImageData(S, S), d = img.data;
  const h = (x, y) => {
    // trama: dois fios cruzados; micro-ruído para não ficar mecânico.
    const weave = Math.sin(x / S * Math.PI * 2 * 26) * 0.5 + Math.sin(y / S * Math.PI * 2 * 26 + 1.6) * 0.5;
    const grain = Math.sin(x * 12.9898 + y * 78.233) * 0.5;
    return weave * 0.7 + (grain - Math.floor(grain)) * 0.25;
  };
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const hl = h((x + S - 1) % S, y), hr = h((x + 1) % S, y), hu = h(x, (y + S - 1) % S), hd = h(x, (y + 1) % S);
    const nx = (hl - hr), ny = (hu - hd), nz = 1;
    const len = Math.hypot(nx, ny, nz), i = (y * S + x) * 4;
    d[i] = (nx / len * 0.5 + 0.5) * 255; d[i + 1] = (ny / len * 0.5 + 0.5) * 255; d[i + 2] = (nz / len * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const tex = new T.CanvasTexture(c); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(6, 6); tex.anisotropy = 4;
  return tex;
}

async function createView() {
  const T = await import('./vendor/three.js');
  const studio = window.doavessoStudio;
  await studio.ready();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Palco -------------------------------------------------------------------
  const el = document.createElement('canvas');
  el.className = 'preview-3d'; el.setAttribute('role', 'img'); el.setAttribute('aria-label', 'Prévia 3D da sua camiseta; arraste para girar');
  el.hidden = true; el.tabIndex = 0;
  preview.appendChild(el);
  const renderer = new T.WebGLRenderer({canvas: el, antialias: true, alpha: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  const scene = new T.Scene();
  scene.environment = new T.PMREMGenerator(renderer).fromScene(new T.RoomEnvironment(), 0.03).texture;
  scene.add(new T.AmbientLight(0xffffff, 0.35));
  const key = new T.DirectionalLight(0xffffff, 1.5); key.position.set(-700, 1000, 1500); scene.add(key);
  const fill = new T.DirectionalLight(0xdfe6ff, 0.5); fill.position.set(900, 200, 700); scene.add(fill);
  const rim = new T.DirectionalLight(0xffffff, 1.1); rim.position.set(300, 500, -1300); scene.add(rim);
  const camera = new T.PerspectiveCamera(26, 1, 10, 8000);
  camera.position.set(0, 25, 2250); camera.lookAt(0, -15, 0);
  const rig = new T.Group(); rig.rotation.x = 0.02; scene.add(rig);

  // Silhueta oversized em px (mesmo sistema da prévia 2D: 1000×1000, origem no centro, y p/ cima).
  const shape = new T.Shape();
  shape.moveTo(95, 400);
  shape.bezierCurveTo(190, 392, 250, 368, 292, 334);       // ombro caído
  shape.bezierCurveTo(352, 292, 416, 250, 452, 214);       // topo da manga
  shape.bezierCurveTo(468, 182, 452, 132, 434, 116);       // ponta da manga
  shape.bezierCurveTo(388, 150, 336, 176, 286, 190);       // axila
  shape.bezierCurveTo(290, 40, 290, -250, 292, -420);      // lateral do corpo
  shape.quadraticCurveTo(150, -438, 0, -438);              // barra
  shape.quadraticCurveTo(-150, -438, -292, -420);
  shape.bezierCurveTo(-290, -250, -290, 40, -286, 190);
  shape.bezierCurveTo(-336, 176, -388, 150, -434, 116);
  shape.bezierCurveTo(-452, 132, -468, 182, -452, 214);
  shape.bezierCurveTo(-416, 250, -352, 292, -292, 334);
  shape.bezierCurveTo(-250, 368, -190, 392, -95, 400);
  shape.quadraticCurveTo(0, 324, 95, 400);                 // decote frontal
  // Menos volume que antes: peça fina, sem "inflar" — some com a cara de massinha.
  const DEPTH = 56, BEVEL = 16;
  const raw = new T.ExtrudeGeometry(shape, {depth: DEPTH, curveSegments: 64, steps: 5, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelSegments: 6});
  raw.deleteAttribute('normal'); raw.deleteAttribute('uv'); // funde só por posição → sem costura de UV
  const geometry = T.mergeVertices(raw, 0.01);
  geometry.translate(0, 0, -DEPTH / 2);
  const FRONT = DEPTH / 2 + BEVEL;

  // Perfil de profundidade: tronco com leve curvatura de peito, mangas planas.
  const body = (x) => { const t = Math.min(1, Math.abs(x) / 300); return 0.5 + 0.5 * Math.sqrt(1 - t * t); };
  const smooth = (t) => t * t * (3 - 2 * t);
  const profile = (x) => { const ax = Math.abs(x); if (ax <= 250) return body(x); if (ax >= 340) return 0.5; return body(250) + (0.5 - body(250)) * smooth((ax - 250) / 90); };
  // Dobras de tecido: ondulações verticais (mais fortes na barra) + uma prega diagonal de caimento.
  const folds = (x, y) => {
    const mask = Math.max(0, 1 - Math.max(0, (Math.abs(x) - 210)) / 90); // some perto das axilas
    if (mask <= 0) return 0;
    const low = 1 - Math.min(1, (y + 438) / 838);            // 0 em cima → 1 na barra
    let f = Math.sin(x * 0.021 + 0.6) * 7 + Math.sin(x * 0.041 - 1.1) * 4;
    f *= 0.35 + 0.65 * low;
    f += Math.sin((x * 0.7 + y) * 0.010) * 3;                // caimento diagonal suave
    return f * mask;
  };
  const pos = geometry.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), oz = pos.getZ(i);
    pos.setZ(i, oz * profile(x) + (oz >= 0 ? 1 : -1) * folds(x, y));
    uv[i * 2] = x / 920 + 0.5; uv[i * 2 + 1] = y / 920 + 0.5;   // UV planar contínua (sem emenda)
  }
  geometry.setAttribute('uv', new T.BufferAttribute(uv, 2));
  geometry.computeVertexNormals();

  const normalMap = makeFabricNormal(T);
  const cloth = new T.MeshPhysicalMaterial({
    color: 0xf2f2ef, roughness: 0.9, metalness: 0,
    sheen: 0.22, sheenRoughness: 0.9, sheenColor: new T.Color(0xd8d8d8),
    normalMap, normalScale: new T.Vector2(0.35, 0.35), envMapIntensity: 0.38
  });
  const tee = new T.Mesh(geometry, cloth); rig.add(tee);

  // Gola em cordão ao redor do decote.
  const zf = (x) => FRONT * profile(x);
  const ring = new T.CatmullRomCurve3([
    new T.Vector3(95, 402, 4), new T.Vector3(48, 350, zf(48) * 0.9), new T.Vector3(0, 328, zf(0) * 0.95), new T.Vector3(-48, 350, zf(-48) * 0.9),
    new T.Vector3(-95, 402, 4), new T.Vector3(-58, 414, -zf(58) * 0.55), new T.Vector3(0, 418, -zf(0) * 0.62), new T.Vector3(58, 414, -zf(58) * 0.55)
  ], true, 'catmullrom', 0.5);
  const collar = new T.Mesh(new T.TubeGeometry(ring, 110, 11, 14, true), new T.MeshPhysicalMaterial({color: 0xececE8, roughness: 0.8, sheen: 1, sheenRoughness: 0.5, normalMap, normalScale: new T.Vector2(0.4, 0.4)}));
  rig.add(collar);

  // Estampa: plano curvo no peito; textura vem do mesmo desenho da prévia 2D.
  const texCanvas = document.createElement('canvas'); texCanvas.width = 600; texCanvas.height = 660;
  const tctx = texCanvas.getContext('2d');
  const texture = new T.CanvasTexture(texCanvas); texture.colorSpace = T.SRGBColorSpace; texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const printGeometry = new T.PlaneGeometry(300, 330, 40, 44);
  const printMaterial = new T.MeshStandardMaterial({map: texture, transparent: true, alphaTest: 0.02, roughness: 0.82, metalness: 0, normalMap, normalScale: new T.Vector2(0.25, 0.25), depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2});
  const print = new T.Mesh(printGeometry, printMaterial); print.renderOrder = 1; rig.add(print);
  const base = printGeometry.attributes.position.array.slice();

  function applyDesign(d) {
    cloth.color.set(d.color === 'white' ? 0xf2f2ef : 0x15161a);
    collar.material.color.set(d.color === 'white' ? 0xe7e7e2 : 0x121317);
    tctx.clearRect(0, 0, 600, 660); tctx.save(); tctx.translate(300, 330); tctx.scale(2, 2); tctx.translate(-500, -500); studio.drawPrint(tctx, d); tctx.restore();
    texture.needsUpdate = true;
    const s = d.scale / 100, a = -d.rotation * Math.PI / 180, cy = 15 - d.y * 3.3, cos = Math.cos(a), sin = Math.sin(a);
    const p = printGeometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1];
      const wx = s * (x * cos - y * sin), wy = cy + s * (x * sin + y * cos);
      p.setXYZ(i, wx, wy, FRONT * profile(wx) + folds(wx, wy) + 1.5);
    }
    p.needsUpdate = true; printGeometry.computeVertexNormals();
  }
  applyDesign(studio.getDesign());
  document.addEventListener('doavesso:design', e => { applyDesign(e.detail); render(); });

  // Interação: giro automático suave (não com "reduzir movimento") + arrastar com mouse/dedo, com inércia.
  let dragging = false, lastX = 0, lastY = 0, spin = 0, tilt = 0.02, tiltTarget = 0.02, autoSpin = reduced ? 0 : 0.32;
  el.style.touchAction = 'none';
  el.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; lastY = e.clientY; spin = 0; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', e => { if (!dragging) return; const dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY; rig.rotation.y += dx * 0.011; spin = dx * 0.011; tiltTarget = Math.max(-0.32, Math.min(0.32, tiltTarget + dy * 0.004)); });
  const release = () => { dragging = false; };
  el.addEventListener('pointerup', release); el.addEventListener('pointercancel', release);
  el.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') { rig.rotation.y -= 0.22; render(); } if (e.key === 'ArrowRight') { rig.rotation.y += 0.22; render(); } });

  let running = false, last = 0;
  function render() { renderer.render(scene, camera); }
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
    if (!dragging) { rig.rotation.y += (autoSpin + spin * 28) * dt; spin *= Math.exp(-dt * 3.5); }
    tilt += (tiltTarget - tilt) * Math.min(1, dt * 6); rig.rotation.x = tilt;
    render(); requestAnimationFrame(frame);
  }
  function resize() { const w = preview.clientWidth, h = preview.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); render(); }
  new ResizeObserver(resize).observe(preview);

  return { setActive(on) { el.hidden = !on; running = on; if (on) { resize(); last = performance.now(); requestAnimationFrame(frame); } } };
}
