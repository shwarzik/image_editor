export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function animateResize(
  from: { w: number; h: number },
  to: { w: number; h: number },
  duration: number,
  onUpdate: (w: number, h: number) => void,
  onDone?: () => void
) {
  let raf: number | null = null;
  let start: number | null = null;
  const step = (ts: number) => {
    if (start == null) start = ts;
    const t = Math.min(1, (ts - start) / duration);
    const e = easeOutCubic(t);
    const w = Math.max(1, Math.round(from.w + (to.w - from.w) * e));
    const h = Math.max(1, Math.round(from.h + (to.h - from.h) * e));
    onUpdate(w, h);
    if (t < 1) {
      raf = requestAnimationFrame(step);
    } else {
      if (onDone) onDone();
      raf = null;
    }
  };
  raf = requestAnimationFrame(step);
  return () => {
    if (raf) cancelAnimationFrame(raf);
  };
}
