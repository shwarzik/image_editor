import type { Stroke } from "@/store/EditorStore";

export type ImgSize = { w: number; h: number };

/**
 * Scale stroke points and width proportionally from the size when it was drawn to the current image size.
 */
export function scaleStroke(stroke: Stroke, imgSize: ImgSize) {
  const bx = stroke.baseSize?.w ?? imgSize.w;
  const by = stroke.baseSize?.h ?? imgSize.h;
  const sx = bx ? imgSize.w / bx : 1;
  const sy = by ? imgSize.h / by : 1;
  const points = stroke.points.flatMap((p) => [p.x * sx, p.y * sy]);
  const width = stroke.size * ((sx + sy) / 2);
  return { points, width };
}

export function isImageEraser(stroke: Stroke) {
  return stroke.tool === "image-eraser";
}
