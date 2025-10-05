export const toRad = (deg: number) => (deg * Math.PI) / 180;

export const rotateAround = (
  x: number,
  y: number,
  cx: number,
  cy: number,
  deg: number
) => {
  const r = toRad(deg);
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const dx = x - cx;
  const dy = y - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
};

export const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
