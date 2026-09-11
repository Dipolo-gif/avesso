// Prévia 3D do estúdio (Three.js). Opcional: o botão "Ver em 3D" carrega vendor/three.js
// só quando clicado. A camiseta é construída aqui (silhueta oversized extrudada com volume
// de corpo), e a estampa desenhada pelo app.js (window.doavessoStudio.drawPrint) vira textura.
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

async function createView() {
  const T = await import('./vendor/three.js');
  const studio = window.doavessoStudio;
  await studio.ready();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Palco -------------------------------------------------------------------
  const el = document.createElement('canvas');
  el.className = 'preview-3d'; el.setAttribute('role', 'img'); el.setAttribute('aria-label', 'Prévia 3D da sua camiseta; arraste para girar');
  el.hidden = true;
  preview.appendChild(el);
  const renderer = new T.WebGLRenderer({canvas: el, antialias: true, alpha: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = T.ACESFilmicToneMapping;
  const scene = new T.Scene();
  scene.environment = new T.PMREMGenerator(renderer).fromScene(new T.RoomEnvironment(), 0.04).texture;
  const key = new T.DirectionalLight(0xffffff, 1.1); key.position.set(600, 900, 1400); scene.add(key);
  const camera = new T.PerspectiveCamera(28, 1, 10, 8000);
  camera.position.set(0, 40, 2150); camera.lookAt(0, -20, 0);
  const rig = new T.Group(); scene.add(rig);

  // Camiseta em px (mesmo sistema da prévia 2D: 1000×1000, origem no centro, y para cima) --
  const shape = new T.Shape();
  shape.moveTo(95, 400);                                   // gola, lado direito
  shape.bezierCurveTo(190, 392, 250, 368, 290, 336);       // ombro caído
  shape.bezierCurveTo(350, 292, 420, 250, 458, 214);       // manga, borda superior
  shape.bezierCurveTo(470, 180, 448, 128, 430, 112);       // ponta da manga
  shape.bezierCurveTo(380, 150, 330, 175, 282, 188);       // axila
  shape.bezierCurveTo(286, 40, 286, -250, 288, -418);      // lateral
  shape.quadraticCurveTo(150, -434, 0, -434);              // barra
  shape.quadraticCurveTo(-150, -434, -288, -418);
  shape.bezierCurveTo(-286, -250, -286, 40, -282, 188);
  shape.bezierCurveTo(-330, 175, -380, 150, -430, 112);
  shape.bezierCurveTo(-448, 128, -470, 180, -458, 214);
  shape.bezierCurveTo(-420, 250, -350, 292, -290, 336);
  shape.bezierCurveTo(-250, 368, -190, 392, -95, 400);
  shape.quadraticCurveTo(0, 322, 95, 400);                 // decote frontal
  const DEPTH = 110, BEVEL = 42;
  const raw = new T.ExtrudeGeometry(shape, {depth: DEPTH, curveSegments: 48, steps: 4, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelSegments: 8});
  raw.deleteAttribute('uv'); raw.deleteAttribute('normal');
  const geometry = T.mergeVertices(raw, 0.01); // funde vértices para sombreamento suave (sem facetas)
  geometry.translate(0, 0, -DEPTH / 2);
  const FRONT = DEPTH / 2 + BEVEL;
  // Volume: seção elíptica no tronco, mangas mais finas, tecido "vestido" e não uma placa.
  const body = (x) => { const t = Math.min(1, Math.abs(x) / 312); return 0.42 + 0.58 * Math.sqrt(1 - t * t); };
  const sleeve = 0.44;
  const profile = (x, y) => { const ax = Math.abs(x); if (ax <= 282) return body(x); if (ax >= 330) return sleeve; const k = (ax - 282) / 48; return body(282) * (1 - k) + sleeve * k; };
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); pos.setZ(i, pos.getZ(i) * profile(x, y)); }
  geometry.computeVertexNormals();
  const cloth = new T.MeshStandardMaterial({color: 0xf1f1ee, roughness: 0.92, metalness: 0});
  const tee = new T.Mesh(geometry, cloth); rig.add(tee);

  // Gola: um cordão ao redor do decote.
  const zf = (x) => FRONT * profile(x, 0);
  const ring = new T.CatmullRomCurve3([
    new T.Vector3(95, 402, 0), new T.Vector3(48, 350, zf(48) * 0.82), new T.Vector3(0, 326, zf(0) * 0.86), new T.Vector3(-48, 350, zf(-48) * 0.82),
    new T.Vector3(-95, 402, 0), new T.Vector3(-58, 412, -zf(-58) * 0.7), new T.Vector3(0, 416, -zf(0) * 0.78), new T.Vector3(58, 412, -zf(58) * 0.7)
  ], true, 'catmullrom', 0.6);
  const collar = new T.Mesh(new T.TubeGeometry(ring, 96, 15, 12, true), new T.MeshStandardMaterial({color: 0xf1f1ee, roughness: 0.95}));
  rig.add(collar);

  // Estampa: plano curvado que acompanha o peito; textura vem do mesmo desenho da prévia 2D.
  const texCanvas = document.createElement('canvas'); texCanvas.width = 600; texCanvas.height = 660;
  const tctx = texCanvas.getContext('2d');
  const texture = new T.CanvasTexture(texCanvas); texture.colorSpace = T.SRGBColorSpace; texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const printGeometry = new T.PlaneGeometry(300, 330, 30, 33);
  const printMaterial = new T.MeshStandardMaterial({map: texture, transparent: true, alphaTest: 0.02, roughness: 0.9, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2});
  const print = new T.Mesh(printGeometry, printMaterial); print.renderOrder = 1; rig.add(print);
  const base = printGeometry.attributes.position.array.slice();

  function applyDesign(d) {
    cloth.color.set(d.color === 'white' ? 0xf1f1ee : 0x1f2023);
    collar.material.color.set(d.color === 'white' ? 0xe9e9e4 : 0x1d1e21);
    tctx.clearRect(0, 0, 600, 660); tctx.save(); tctx.translate(300, 330); tctx.scale(2, 2); tctx.translate(-500, -500); studio.drawPrint(tctx, d); tctx.restore();
    texture.needsUpdate = true;
    const s = d.scale / 100, a = -d.rotation * Math.PI / 180, cy = 15 - d.y * 3.3, cos = Math.cos(a), sin = Math.sin(a);
    const p = printGeometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1];
      const wx = s * (x * cos - y * sin), wy = cy + s * (x * sin + y * cos);
      p.setXYZ(i, wx, wy, FRONT * profile(wx, wy) + 1.5);
    }
    p.needsUpdate = true; printGeometry.computeVertexNormals();
  }
  applyDesign(studio.getDesign());
  document.addEventListener('doavesso:design', e => { applyDesign(e.detail); render(); });

  // Interação: giro automático suave (exceto com "reduzir movimento") + arrastar com mouse/dedo.
  let dragging = false, lastX = 0, lastY = 0, velocity = 0, tiltX = 0, autoSpin = reduced ? 0 : 0.35;
  el.style.touchAction = 'none';
  el.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; lastY = e.clientY; velocity = 0; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', e => { if (!dragging) return; const dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY; rig.rotation.y += dx * 0.012; velocity = dx * 0.012; tiltX = Math.max(-0.35, Math.min(0.35, tiltX + dy * 0.004)); });
  const release = () => { dragging = false; };
  el.addEventListener('pointerup', release); el.addEventListener('pointercancel', release);
  el.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') rig.rotation.y -= 0.25; if (e.key === 'ArrowRight') rig.rotation.y += 0.25; });
  el.tabIndex = 0;

  let running = false, last = 0;
  function render() { renderer.render(scene, camera); }
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
    if (!dragging) { rig.rotation.y += (autoSpin + velocity * 30) * dt; velocity *= 0.92; }
    rig.rotation.x += (tiltX - rig.rotation.x) * 0.1;
    render(); requestAnimationFrame(frame);
  }
  function resize() { const w = preview.clientWidth, h = preview.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); render(); }
  new ResizeObserver(resize).observe(preview);

  return {
    setActive(on) { el.hidden = !on; running = on; if (on) { resize(); last = performance.now(); requestAnimationFrame(frame); } }
  };
}
