import { useCallback, useMemo, useState } from "react";

export type CropRect = { x: number; y: number; w: number; h: number } | null;
export type Point = { x: number; y: number };
export type Bounds = { left: number; top: number; right: number; bottom: number };

export type Handle = "nw" | "ne" | "sw" | "se" | "n" | "s" | "w" | "e";

export function useCrop() {
  const [crop, setCrop] = useState<CropRect>(null);
  const [dragHandle, setDragHandle] = useState<Handle | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<Point | null>(null);
  const [showCropUI, setShowCropUI] = useState(true);

  const norm = useCallback((r: NonNullable<CropRect>) => {
    let { x, y, w, h } = r;
    if (w < 0) { x += w; w = -w; }
    if (h < 0) { y += h; h = -h; }
    return { x, y, w, h } as NonNullable<CropRect>;
  }, []);

  const handles = useCallback((r: NonNullable<CropRect>) => ([
    { name: "nw" as Handle, x: r.x, y: r.y },
    { name: "ne" as Handle, x: r.x + r.w, y: r.y },
    { name: "sw" as Handle, x: r.x, y: r.y + r.h },
    { name: "se" as Handle, x: r.x + r.w, y: r.y + r.h },
    { name: "n" as Handle, x: r.x + r.w / 2, y: r.y },
    { name: "s" as Handle, x: r.x + r.w / 2, y: r.y + r.h },
    { name: "w" as Handle, x: r.x, y: r.y + r.h / 2 },
    { name: "e" as Handle, x: r.x + r.w, y: r.y + r.h / 2 },
  ]), []);

  return {
    crop,
    setCrop,
    dragHandle,
    setDragHandle,
    isDrawing,
    setIsDrawing,
    drawStart,
    setDrawStart,
    showCropUI,
    setShowCropUI,
    norm,
    handles,
  } as const;
}
