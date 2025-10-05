"use client";
import { useEffect } from "react";
import type { FiltersState } from "@/store/EditorStore";

export function useApplyKonvaFilters(imageNodeRef: React.MutableRefObject<any>, filters: FiltersState, imgSize: { w: number; h: number } | null) {
  useEffect(() => {
    const node = imageNodeRef.current;
    if (!node) return;
    const anyEnabled = Object.values(filters.enabled).some(Boolean);
    if (!anyEnabled) {
      try { node.clearCache(); } catch {}
      try { node.filters([]); } catch {}
      node.getLayer()?.batchDraw();
      return;
    }
    try { node.cache({ pixelRatio: 1 }); } catch {}
    const f = filters;
    if (node.blurRadius && typeof f.blurRadius === 'number') node.blurRadius(f.blurRadius);
    if (node.brightness && typeof f.brightness === 'number') node.brightness(f.brightness);
    if (node.contrast && typeof f.contrast === 'number') node.contrast(f.contrast);
    if (node.embossStrength && typeof f.embossStrength === 'number') node.embossStrength(f.embossStrength);
    if (node.embossWhiteLevel && typeof f.embossWhiteLevel === 'number') node.embossWhiteLevel(f.embossWhiteLevel);
    if (node.embossDirection && f.embossDirection) node.embossDirection(f.embossDirection);
    if (node.embossBlend && typeof f.embossBlend === 'boolean') node.embossBlend(f.embossBlend);
    if (node.enhance && typeof f.enhance === 'number') node.enhance(f.enhance);
    if (node.hue && typeof f.hue === 'number') node.hue(f.hue);
    if (node.saturation && typeof f.saturation === 'number') node.saturation(f.saturation);
    if (node.luminance && typeof f.luminance === 'number') node.luminance(f.luminance);
    if (node.value && typeof f.value === 'number') node.value(f.value);
    if (node.noise && typeof f.noise === 'number') node.noise(f.noise);
    if (node.pixelSize && typeof f.pixelSize === 'number') node.pixelSize(f.pixelSize);
    if (node.levels && typeof f.levels === 'number') node.levels(f.levels);
    if (node.red && typeof f.red === 'number') node.red(f.red);
    if (node.green && typeof f.green === 'number') node.green(f.green);
    if (node.blue && typeof f.blue === 'number') node.blue(f.blue);
    if (node.alpha && typeof f.alpha === 'number') node.alpha(f.alpha);
    if (node.threshold && typeof f.threshold === 'number' && filters.enabled.threshold) node.threshold(f.threshold);
    if (node.threshold && typeof f.maskThreshold === 'number' && filters.enabled.mask) node.threshold(f.maskThreshold);

    const F = (window as any).Konva?.Filters || {};
    const e = filters.enabled;
    const fl: any[] = [];
    if (e.grayscale && F.Grayscale) fl.push(F.Grayscale);
    if (e.sepia && F.Sepia) fl.push(F.Sepia);
    if (e.invert && F.Invert) fl.push(F.Invert);
    if (e.blur && F.Blur) fl.push(F.Blur);
    if (e.brighten && F.Brighten) fl.push(F.Brighten);
    if (e.brightness && F.Brightness) fl.push(F.Brightness);
    if (e.contrast && F.Contrast) fl.push(F.Contrast);
    if (e.enhance && F.Enhance) fl.push(F.Enhance);
    if (e.emboss && F.Emboss) fl.push(F.Emboss);
    if (e.hsl && F.HSL) fl.push(F.HSL);
    if (e.hsv && F.HSV) fl.push(F.HSV);
    if (e.noise && F.Noise) fl.push(F.Noise);
    if (e.pixelate && F.Pixelate) fl.push(F.Pixelate);
    if (e.posterize && F.Posterize) fl.push(F.Posterize);
    if (e.rgb && F.RGB) fl.push(F.RGB);
    if (e.rgba && F.RGBA) fl.push(F.RGBA);
    if (e.solarize && F.Solarize) fl.push(F.Solarize);
    if (e.threshold && F.Threshold) fl.push(F.Threshold);
    if (e.mask && F.Mask) fl.push(F.Mask);
    try { node.filters(fl); } catch {}
    node.getLayer()?.batchDraw();
  }, [filters, imgSize]);
}
