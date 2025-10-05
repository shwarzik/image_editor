import { useEffect, useState } from "react";

export function useImageFit(image: HTMLImageElement | null, stageSize: number) {
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!image) {
      setImgSize(null);
      setOffset({ x: 0, y: 0 });
      return;
    }
    const nw = (image as HTMLImageElement).naturalWidth || image.width;
    const nh = (image as HTMLImageElement).naturalHeight || image.height;
    if (!nw || !nh) return;
    const scale = Math.min(1, Math.min(stageSize / nw, stageSize / nh));
    const w = Math.round(nw * scale);
    const h = Math.round(nh * scale);
    const ox = Math.round((stageSize - w) / 2);
    const oy = Math.round((stageSize - h) / 2);
    setImgSize({ w, h });
    setOffset({ x: ox, y: oy });
  }, [image, stageSize]);

  return { imgSize, setImgSize, offset, setOffset } as const;
}
