"use client";
import { useEffect, useRef } from "react";
import type { FiltersState, Stroke } from "@/store/EditorStore";

export function useFilterSnapshots({
  src,
  offset,
  imgSize,
  crop,
  rotation,
  filters,
  strokes,
  pushSnapshot,
  isRestoringRef,
}: {
  src: string | null;
  offset: { x: number; y: number };
  imgSize: { w: number; h: number } | null;
  crop: { x: number; y: number; w: number; h: number } | null;
  rotation: number;
  filters: FiltersState;
  strokes: Stroke[];
  pushSnapshot: (s: any) => void;
  isRestoringRef: React.MutableRefObject<boolean>;
}) {
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    if (isRestoringRef.current) return;
    if (!src) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      pushSnapshot({ src, offset, imgSize: imgSize ?? null, crop, rotation, filters, strokes });
    }, 250);
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [filters]);
}
