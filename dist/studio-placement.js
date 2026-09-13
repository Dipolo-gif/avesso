// Posicionamento da estampa em metros, no espaço da peça. Compartilhado por render, interação e testes.
// Uma estampa tem um "lugar": {p:[x,y,z], n:[nx,ny,nz], zone}: ponto e normal na superfície da camiseta.
// Estampas na frente dentro da área dos sliders usam só (x, y) (compatível com a prévia 2D e pedidos antigos).
export const CHEST_Y = .44;
export const UNIT = .0034;
export const PRINT_W = .30, PRINT_H = .33;         // caixa da estampa a 100%
export const SLIDER_X = 30, SLIDER_Y = 25;
export const ZONE_LABEL = {front:'frente', back:'costas', 'sleeve-left':'manga esquerda', 'sleeve-right':'manga direita', side:'lateral'};

// ---- frente (sliders x/y) ----
export function printTransform(d) {
  const angle = -(d.rotation || 0) * Math.PI / 180;
  const w = PRINT_W * d.scale / 100, h = PRINT_H * d.scale / 100;
  const x = (d.x || 0) * UNIT, y = CHEST_Y - (d.y || 0) * UNIT;
  const a = Math.cos(angle) / w, b = Math.sin(angle) / w;
  const c = -Math.sin(angle) / h, e = Math.cos(angle) / h;
  return [a, b, .5 - a*x - b*y, c, e, .5 - c*x - e*y];
}
export function printUV(point, d) {
  const [a,b,x,c,e,y] = printTransform(d);
  return {x:a*point.x+b*point.y+x, y:c*point.x+e*point.y+y};
}
export function dragPosition(point, offset) {
  return {
    x:Math.max(-SLIDER_X, Math.min(SLIDER_X, Math.round((point.x-offset.x)/UNIT))),
    y:Math.max(-SLIDER_Y, Math.min(SLIDER_Y, Math.round((CHEST_Y-point.y+offset.y)/UNIT)))
  };
}

// ---- qualquer lugar da peça ----
const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0]/l, v[1]/l, v[2]/l]; };
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];

// Base ortonormal da estampa apoiada na superfície: "cima" é o cima do mundo projetado no plano
// tangente (texto fica em pé em qualquer lado), girada pela rotação escolhida.
export function printFrame(place, d) {
  const n = norm(place.n);
  let up = [-n[0]*n[1], 1 - n[1]*n[1], -n[2]*n[1]];
  if (Math.hypot(up[0], up[1], up[2]) < 1e-3) up = [0, 0, 1];
  up = norm(up);
  const right = norm(cross(up, n));
  const a = -(d.rotation || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  const k = (d.scale || 80) / 100;
  return {
    origin: [place.p[0], place.p[1], place.p[2]],
    right: [right[0]*c + up[0]*s, right[1]*c + up[1]*s, right[2]*c + up[2]*s],
    up: [up[0]*c - right[0]*s, up[1]*c - right[1]*s, up[2]*c - right[2]*s],
    normal: n, w: PRINT_W * k, h: PRINT_H * k
  };
}
export function frameUV(frame, point) {
  const q = [point[0]-frame.origin[0], point[1]-frame.origin[1], point[2]-frame.origin[2]];
  return {x: dot(q, frame.right)/frame.w + .5, y: dot(q, frame.up)/frame.h + .5, depth: dot(q, frame.normal)};
}
// Matriz 4×4 (column-major, ordem do three.js) que leva um ponto do mundo para (u, v, profundidade/depth).
export function projectorMatrix(frame, depth = .12) {
  const {origin:o, right:r, up:u, normal:n, w, h} = frame;
  return [
    r[0]/w, u[0]/h, n[0]/depth, 0,
    r[1]/w, u[1]/h, n[1]/depth, 0,
    r[2]/w, u[2]/h, n[2]/depth, 0,
    .5 - dot(r, o)/w, .5 - dot(u, o)/h, -dot(n, o)/depth, 1
  ];
}
// Lugar equivalente aos sliders (frente, no plano z = 0; o 3D resolve a profundidade por raio).
export function frontPlace(d) {
  return {p: [(d.x || 0) * UNIT, CHEST_Y - (d.y || 0) * UNIT, 0], n: [0, 0, 1], zone: 'front'};
}
// Se um lugar cai na frente dentro da faixa dos sliders, devolve {x, y}; senão null.
export function sliderPosition(place) {
  if (!place || place.zone !== 'front') return null;
  const x = Math.round(place.p[0] / UNIT), y = Math.round((CHEST_Y - place.p[1]) / UNIT);
  return Math.abs(x) <= SLIDER_X && Math.abs(y) <= SLIDER_Y ? {x, y} : null;
}
// Zona pela posição/normal (peça centrada em x=0, altura em y). halfWidth = meia largura da peça com mangas.
export function zoneOf(p, n, halfWidth) {
  if (Math.abs(p[0]) > halfWidth * .62 && p[1] > .40) return p[0] > 0 ? 'sleeve-left' : 'sleeve-right';
  if (Math.abs(n[0]) > .75) return 'side';
  return n[2] >= 0 ? 'front' : 'back';
}
// Novo lugar ao arrastar: o ponto sob o dedo continua no mesmo ponto da estampa (grab = uv − .5 no toque).
export function dragPlace(hitPoint, hitNormal, grab, d, halfWidth) {
  const frame = printFrame({p: hitPoint, n: hitNormal}, d);
  const p = [0, 1, 2].map(i => hitPoint[i] - frame.right[i]*grab.u*frame.w - frame.up[i]*grab.v*frame.h);
  return {p, n: frame.normal, zone: zoneOf(hitPoint, frame.normal, halfWidth)};
}
