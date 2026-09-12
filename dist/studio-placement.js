// World-space front print, in metres. Shared by rendering and pointer interaction.
export const CHEST_Y = .44;
export const UNIT = .0034;
export function printTransform(d) {
  const angle = -(d.rotation || 0) * Math.PI / 180;
  const w = .30 * d.scale / 100, h = .33 * d.scale / 100;
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
    x:Math.max(-30, Math.min(30, Math.round((point.x-offset.x)/UNIT))),
    y:Math.max(-25, Math.min(25, Math.round((CHEST_Y-point.y+offset.y)/UNIT)))
  };
}
