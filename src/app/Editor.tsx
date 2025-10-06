"use client";
import React, { useRef, useState, useEffect, useMemo } from "react";

import { Stage, Layer, Image as KonvaImage, Rect, Group, Circle, Text, Line } from "react-konva";
import useImage from "use-image";
import { Button } from "@/components/ui/button";
import { Toolbar } from "@/components/Toolbar";
import { useCrop, type Handle } from "@/components/editor/hooks/useCrop";
import { useEditorStore } from "@/store/EditorStore";
import { rotateAround, clamp } from "@/components/editor/utils/math";
import { useApplyKonvaFilters } from "@/components/editor/hooks/useFilters";
import { useFilterSnapshots } from "@/components/editor/hooks/useFilterSnapshots";
import { animateResize } from "@/components/editor/utils/animation";
import { Chessboard } from "@/components/editor/Chessboard";
import { ImageContent } from "@/components/editor/ImageContent";
import { DrawingLayer, StageDrawingOverlay } from "@/components/editor/DrawingLayer";
import { CursorPreview } from "@/components/editor/CursorPreview";
import { CropOverlay } from "@/components/editor/CropOverlay";
import { HANDLE_HIT_RADIUS, ROTATE_HANDLE_OFFSET, ROTATE_HIT_RADIUS } from "@/components/editor/constants";

export default function Editor() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const {
    imageSrc: src,
    setImageSrc: setSrc,
    viewSize,
    setViewSize,
    tool,
    setTool,
    offset,
    setOffset,
    imgSize,
    setImgSize,
    crop: storeCrop,
    setCrop: setStoreCrop,
    rotation,
    setRotation,
    filters,
    setFilters,
    canUndo,
    canRedo,
    undo,
    redo,
    pushSnapshot,
    createOrSelectObject,
    strokes,
    setStrokes,
    brushColor,
    brushSize,
    eraserSize,
    imageEraserSize,
    setBrushColor,
    setBrushSize,
    setEraserSize,
    setImageEraserSize,
  } = useEditorStore();
  const [image] = useImage(src || "");
  const isRestoringRef = useRef(false);
  const lastPushedSrcRef = useRef<string | null>(null);
  // removed unused panning tracking state
  // useCrop for UI-only states; keep crop in store and mirror for UI helpers
  const { crop, setCrop, dragHandle, setDragHandle, isDrawing, setIsDrawing, drawStart, setDrawStart, showCropUI, setShowCropUI, norm: normCrop } = useCrop();
  // keep hook crop in sync with store crop
  useEffect(() => { setCrop(storeCrop); }, [storeCrop, setCrop]);
  // whenever hook sets crop, reflect to store
  const setBothCrop = (c: typeof storeCrop) => { setCrop(c); setStoreCrop(c); };
  const rotateRef = useRef<{ startAngle: number; startRotation: number } | null>(null);
  const resizeRef = useRef<{ x: number; y: number } | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  // legacy bake placement removed
  // In crop mode we visually suppress rotation without changing the actual rotation state.
  // Track crop at entry to Crop mode to detect if user actually changed it
  const previousCropRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  // animation functions moved to utils

  // helper moved into useCrop hook (normCrop)

  // chessboard background cells
  const gridSize = 32;
  // Stage size equals the measured view size; do not depend on the image so Stage doesn't change on crop
  const STAGE_W = viewSize.w;
  const STAGE_H = viewSize.h;

  // Measure container size and available viewport height; keep Stage from exceeding container width
  // Container that wraps ONLY the canvas area (left column). This lets us measure
  // available width for the Stage without including the right sidebar.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageMountRef = useRef<HTMLDivElement | null>(null);
  // Track if we've already sized the canvas for the current image src
  const lastSizedSrcRef = useRef<string | null>(null);
  // Skip fitting on the next image load (used when applying crop)
  const skipFitForNextSrcRef = useRef(false);
  // Placement to restore after crop (preserve stage-space position)
  const pendingCropPlacementRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  // Effective rotation to render (0 in crop or image-eraser mode; real rotation otherwise)
  const displayRotation = (tool === 'crop' || tool === 'image-eraser') ? 0 : rotation;
  const imageRef = useRef<any>(null);
  // Cursor tracking for brush/eraser preview
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  // Track which handle (if any) the mouse is over for cursor feedback
  const [hoverHandle, setHoverHandle] = useState<string | null>(null);
  const [hoverRotate, setHoverRotate] = useState(false);
  useApplyKonvaFilters(imageRef, filters, imgSize ?? null);

  // Touch/coarse pointer detection to tune UX on mobile
  const isCoarsePointer = useMemo(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    try {
      return window.matchMedia('(pointer: coarse)').matches;
    } catch {
      return false;
    }
  }, []);

  // Backfill baseSize for existing strokes so they scale with future resizes
  useEffect(() => {
    if (!imgSize || !strokes || strokes.length === 0) return;
    const needsBackfill = strokes.some((s: any) => !s.baseSize);
    if (!needsBackfill) return;
    setStrokes((prev: any) => prev.map((s: any) => s.baseSize ? s : { ...s, baseSize: { w: imgSize.w, h: imgSize.h } }));
  }, [imgSize, strokes, setStrokes]);

  useFilterSnapshots({ src, offset, imgSize: imgSize ?? null, crop, rotation, filters, strokes, pushSnapshot, isRestoringRef });

  // When returning to Pan (resize) mode, ensure the saved crop remains visible
  useEffect(() => {
    if (tool === 'pan') {
      // Show overlay, but do not re-initialize crop if it already exists
      setShowCropUI(!!storeCrop);
    }
  }, [tool, storeCrop, setShowCropUI]);

  // Recompute Stage size on mount and window resize; ensure default canvas fits viewport
  useEffect(() => {
    const BASE_W = 500;
    const BASE_H = 500;
    const compute = () => {
      const el = containerRef.current;
      const mount = stageMountRef.current;
      if (!el || !mount) return;
      const rect = el.getBoundingClientRect();
      const mrect = mount.getBoundingClientRect();
      const availW = Math.max(1, Math.floor(rect.width));
      const availH = Math.max(1, Math.floor(window.innerHeight - mrect.top - 16));
      if (!image) {
        // Fit a square-ish default canvas within viewport
        const scale = Math.min(availW / BASE_W, availH / BASE_H, 1);
        const w = Math.max(1, Math.round(BASE_W * scale));
        const h = Math.max(1, Math.round(BASE_H * scale));
        setViewSize({ w, h });
      } else {
        // With image loaded, refit to width (fallback to height) and update canvas and image sizes.
        const iw = (image as HTMLImageElement).naturalWidth || 1;
        const ih = (image as HTMLImageElement).naturalHeight || 1;
        const scaleW = Math.min(availW / iw, 1);
        let wFit = Math.round(iw * scaleW);
        let hFit = Math.round(ih * scaleW);
        let finalW = Math.min(availW, wFit);
        let scale2 = finalW / iw;
        let finalH = Math.round(ih * scale2);
        if (finalH > availH) {
          scale2 = Math.min(availW / iw, availH / ih, 1);
          finalW = Math.round(iw * scale2);
          finalH = Math.round(ih * scale2);
        }
        setViewSize({ w: finalW, h: finalH });
        setImgSize({ w: finalW, h: finalH });
        setOffset({ x: 0, y: 0 });
        setBothCrop({ x: 0, y: 0, w: finalW, h: finalH });
      }
    };
    // initial compute and listeners
    compute();
    const onResize = () => compute();
    window.addEventListener('resize', onResize);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      ro = new ResizeObserver(() => compute());
      ro.observe(containerRef.current);
    }
    return () => {
      window.removeEventListener('resize', onResize);
      if (ro && containerRef.current) {
        try { ro.unobserve(containerRef.current); } catch {}
        try { ro.disconnect(); } catch {}
      }
    };
  }, [image, setViewSize]);

  // geometry helpers moved to utils
  const getCenter = () => ({ x: offset.x + (imgSize?.w ?? 0) / 2, y: offset.y + (imgSize?.h ?? 0) / 2 });

  // Image bounds in stage space and clamps
  const getBounds = () => {
    if (!imgSize) return null;
    return {
      left: offset.x,
      top: offset.y,
      right: offset.x + imgSize.w,
      bottom: offset.y + imgSize.h,
    } as const;
  };
  const clampPoint = (x: number, y: number) => {
    const b = getBounds();
    if (!b) return { x, y };
    return { x: clamp(x, b.left, b.right), y: clamp(y, b.top, b.bottom) };
  };
  const onMouseDown = (e: any) => {
    // Prevent page scroll/zoom on touch during interactions
    if (e?.evt && 'touches' in e.evt && typeof e.evt.preventDefault === 'function') {
      if (e.evt.cancelable) e.evt.preventDefault();
    }
    // Only react to left mouse button
    if (e?.evt && typeof e.evt.button === 'number' && e.evt.button !== 0) return;
    const pos = e.target.getStage().getPointerPosition();
    if (!pos) return;
    const hadCrop = !!crop;
    // Drawing tools
    if (tool === 'brush' || tool === 'eraser' || tool === 'image-eraser') {
      // Image eraser requires an image and inside-bounds
      const b = getBounds();
      if (tool === 'image-eraser') {
        if (!imgSize || !b) return;
        const inside = pos.x >= b.left && pos.x <= b.right && pos.y >= b.top && pos.y <= b.bottom;
        if (!inside) return;
      }
      // Compute local point based on the coordinate space
      let local: { x: number; y: number };
      let coordinateSpace: 'stage' | 'image' = 'stage';
      if (tool === 'image-eraser') {
        const { x: cx, y: cy } = getCenter();
        const p0 = rotateAround(pos.x, pos.y, cx, cy, -displayRotation);
        local = { x: p0.x - offset.x, y: p0.y - offset.y };
        coordinateSpace = 'image';
      } else {
        local = { x: pos.x, y: pos.y };
        coordinateSpace = 'stage';
      }
      const id = `s-${Date.now()}`;
      const size = tool === 'brush' ? brushSize : (tool === 'image-eraser' ? imageEraserSize : eraserSize);
      const color = tool === 'brush' ? brushColor : undefined;
      setStrokes((prev: any) => [
        ...prev,
        { id, tool, color, size, points: [local], baseSize: imgSize ? { w: imgSize.w, h: imgSize.h } : undefined, coordinateSpace },
      ]);
      return;
    }
    // Crop tool init
    if (tool === 'crop') {
      const b = getBounds();
      if (!b) return;
      if (!crop) {
        if (pos.x < b.left || pos.x > b.right || pos.y < b.top || pos.y > b.bottom) return;
        const p = clampPoint(pos.x, pos.y);
        setBothCrop({ x: p.x, y: p.y, w: 0, h: 0 });
        setDrawStart({ x: p.x, y: p.y });
        setIsDrawing(true);
        setShowCropUI(true);
        return;
      }
    } else {
      // Pan mode: initialize selection on image click if none exists
      const b = getBounds();
      const insideImage = b ? (pos.x >= b.left && pos.x <= b.right && pos.y >= b.top && pos.y <= b.bottom) : false;
      if (!crop) {
        if (insideImage && imgSize) {
          setBothCrop({ x: offset.x, y: offset.y, w: imgSize.w, h: imgSize.h });
          setShowCropUI(true);
        } else {
          setShowCropUI(false);
          return;
        }
      }
    }

    // If we already have a crop, decide visibility & handle hit
    if (crop) {
      const HANDLE_RADIUS = isCoarsePointer ? Math.max(24, HANDLE_HIT_RADIUS) : HANDLE_HIT_RADIUS;
      const ROTATE_RADIUS = isCoarsePointer ? Math.max(28, ROTATE_HIT_RADIUS) : ROTATE_HIT_RADIUS;
      // rotation handle detection in pan mode should happen BEFORE insideCrop check,
      // because the handle is outside the crop box
      if (tool === 'pan') {
        const { x: cx, y: cy } = getCenter();
        const baseRx = crop.x + crop.w / 2;
        const baseRy = crop.y - ROTATE_HANDLE_OFFSET;
        const rpos = rotateAround(baseRx, baseRy, cx, cy, rotation);
        const dxr = pos.x - rpos.x;
        const dyr = pos.y - rpos.y;
        if (dxr * dxr + dyr * dyr <= ROTATE_RADIUS * ROTATE_RADIUS) {
          const cx0 = crop.x + crop.w / 2;
          const cy0 = crop.y + crop.h / 2;
          const angle = Math.atan2(pos.y - cy0, pos.x - cx0) * 180 / Math.PI;
          rotateRef.current = { startAngle: angle, startRotation: rotation };
          setIsRotating(true);
          setShowCropUI(true);
          return;
        }
        // Also detect resize handles BEFORE inside-crop gating so they are interactive wherever they appear
        const baseHandles: { name: Handle; x: number; y: number }[] = [
          { name: "nw" as Handle, x: crop.x, y: crop.y },
          { name: "ne" as Handle, x: crop.x + crop.w, y: crop.y },
          { name: "sw" as Handle, x: crop.x, y: crop.y + crop.h },
          { name: "se" as Handle, x: crop.x + crop.w, y: crop.y + crop.h },
          { name: "n" as Handle, x: crop.x + crop.w / 2, y: crop.y },
          { name: "s" as Handle, x: crop.x + crop.w / 2, y: crop.y + crop.h },
          { name: "w" as Handle, x: crop.x, y: crop.y + crop.h / 2 },
          { name: "e" as Handle, x: crop.x + crop.w, y: crop.y + crop.h / 2 },
        ];
        const handles = baseHandles.map(h => {
          const { x: cx2, y: cy2 } = getCenter();
          const p = rotateAround(h.x, h.y, cx2, cy2, rotation);
          return { name: h.name, x: p.x, y: p.y };
        });
        for (const h of handles) {
          const dx = pos.x - h.x;
          const dy = pos.y - h.y;
          if (dx * dx + dy * dy <= HANDLE_RADIUS * HANDLE_RADIUS) {
            setDragHandle(h.name);
            const { x: cx3, y: cy3 } = getCenter();
            resizeRef.current = { x: cx3, y: cy3 };
            setShowCropUI(true);
            return;
          }
        }
      }
      // inside-crop test: only un-rotate in pan mode. In crop mode keep axis-aligned test.
      const insideCrop = (() => {
        if (tool === 'pan') {
          const { x: cx, y: cy } = getCenter();
          const unrot = rotateAround(pos.x, pos.y, cx, cy, -rotation);
          return unrot.x >= crop.x && unrot.x <= crop.x + crop.w && unrot.y >= crop.y && unrot.y <= crop.y + crop.h;
        }
        return pos.x >= crop.x && pos.x <= crop.x + crop.w && pos.y >= crop.y && pos.y <= crop.y + crop.h;
      })();
      if (!insideCrop) {
        if (tool === 'crop') {
          setShowCropUI(false);
        } else {
          // In pan mode: if click is outside both crop and image, hide UI
          const b2 = getBounds();
          const insideImage = b2 ? (pos.x >= b2.left && pos.x <= b2.right && pos.y >= b2.top && pos.y <= b2.bottom) : false;
          if (!insideImage) setShowCropUI(false);
        }
        return;
      }
      if (!showCropUI) {
        setShowCropUI(true);
        return;
      }
      // detect handles in crop mode (axis-aligned)
      if (tool === 'crop') {
        const baseHandles: { name: Handle; x: number; y: number }[] = [
          { name: "nw" as Handle, x: crop.x, y: crop.y },
          { name: "ne" as Handle, x: crop.x + crop.w, y: crop.y },
          { name: "sw" as Handle, x: crop.x, y: crop.y + crop.h },
          { name: "se" as Handle, x: crop.x + crop.w, y: crop.y + crop.h },
          { name: "n" as Handle, x: crop.x + crop.w / 2, y: crop.y },
          { name: "s" as Handle, x: crop.x + crop.w / 2, y: crop.y + crop.h },
          { name: "w" as Handle, x: crop.x, y: crop.y + crop.h / 2 },
          { name: "e" as Handle, x: crop.x + crop.w, y: crop.y + crop.h / 2 },
        ];
        for (const h of baseHandles) {
          const dx = pos.x - h.x;
          const dy = pos.y - h.y;
          const HANDLE_RADIUS2 = isCoarsePointer ? Math.max(24, HANDLE_HIT_RADIUS) : HANDLE_HIT_RADIUS;
          if (dx * dx + dy * dy <= HANDLE_RADIUS2 * HANDLE_RADIUS2) {
            setDragHandle(h.name);
            const { x: cx3, y: cy3 } = getCenter();
            resizeRef.current = { x: cx3, y: cy3 };
            setShowCropUI(true);
            return;
          }
        }
      }
    }
    // inside crop (not on a handle)
    setShowCropUI(true);
    if (tool !== 'crop') {
      // If there was no crop before this click (we just initialized it), don't start drag; just show selection lines
      if (hadCrop) imageGroupRef.current?.startDrag();
    }
    return;
  };

  const onMouseMove = (e: any) => {
    // Prevent page scroll while dragging on touch
    if (e?.evt && 'touches' in e.evt && typeof e.evt.preventDefault === 'function') {
      if (e.evt.cancelable) e.evt.preventDefault();
    }
    // Always update cursor position for preview
    const pos = e.target.getStage().getPointerPosition();
    if (pos) setCursorPos(pos);
    // Detect handle/rotation hover for crop/pan
    if ((tool === 'crop' || tool === 'pan') && crop) {
      let overHandle: string | null = null;
      let overRotate = false;
      const b = getBounds();
      if (b) {
        // For pan, un-rotate pointer
        let px = pos.x, py = pos.y;
        if (tool === 'pan') {
          const { x: cx, y: cy } = getCenter();
          const un = rotateAround(pos.x, pos.y, cx, cy, -rotation);
          px = un.x;
          py = un.y;
        }
        // Handles
        const handles = [
          { name: 'nw', x: crop.x, y: crop.y },
          { name: 'ne', x: crop.x + crop.w, y: crop.y },
          { name: 'sw', x: crop.x, y: crop.y + crop.h },
          { name: 'se', x: crop.x + crop.w, y: crop.y + crop.h },
          { name: 'n', x: crop.x + crop.w / 2, y: crop.y },
          { name: 's', x: crop.x + crop.w / 2, y: crop.y + crop.h },
          { name: 'w', x: crop.x, y: crop.y + crop.h / 2 },
          { name: 'e', x: crop.x + crop.w, y: crop.y + crop.h / 2 },
        ];
        const handleHoverRadius = isCoarsePointer ? 24 : 16;
        for (const h of handles) {
          const dx = px - h.x;
          const dy = py - h.y;
          if (dx * dx + dy * dy <= handleHoverRadius * handleHoverRadius) { // HANDLE_HIT_RADIUS
            overHandle = h.name;
            break;
          }
        }
        // Rotation handle (only in pan mode)
        if (!overHandle && tool === 'pan') {
          const rx = crop.x + crop.w / 2;
          const ry = crop.y - 32; // ROTATE_HANDLE_OFFSET
          const { x: cx, y: cy } = getCenter();
          const rpos = rotateAround(rx, ry, cx, cy, rotation);
          const dxr = pos.x - rpos.x;
          const dyr = pos.y - rpos.y;
          const rotateHoverRadius = isCoarsePointer ? 28 : 18;
          if (dxr * dxr + dyr * dyr <= rotateHoverRadius * rotateHoverRadius) { // ROTATE_HIT_RADIUS
            overRotate = true;
          }
        }
      }
      setHoverHandle(overHandle);
      setHoverRotate(overRotate);
    } else {
      setHoverHandle(null);
      setHoverRotate(false);
    }
    // Only perform actions while left mouse button is held down
    if (e?.evt && typeof e.evt.buttons === 'number' && (e.evt.buttons & 1) === 0) return;
    if (tool === "pan" && !dragHandle && !isRotating) return; // only track if resizing/rotating via handles in pan mode
    if (tool === "brush" || tool === "eraser" || tool === 'image-eraser') {
      if (!pos) return;
      if (tool === 'image-eraser') {
        if (!imgSize) return;
        const b = getBounds();
        if (!b) return;
        const inside = pos.x >= b.left && pos.x <= b.right && pos.y >= b.top && pos.y <= b.bottom;
        if (!inside) return;
      }
      if (strokes.length === 0) return;
      // add point to last stroke
      let local: { x: number; y: number };
      if (tool === 'image-eraser') {
        const { x: cx, y: cy } = getCenter();
        const p0 = rotateAround(pos.x, pos.y, cx, cy, -displayRotation);
        local = { x: p0.x - offset.x, y: p0.y - offset.y };
      } else {
        local = { x: pos.x, y: pos.y };
      }
      setStrokes((prev: any) => {
        const next = prev.slice();
        const last = next[next.length - 1];
        if (!last) return next;
        last.points = [...last.points, local];
        next[next.length - 1] = last;
        return next;
      });
      return;
    }
    if (tool !== "crop" && tool !== "pan") return;
    if (!pos) return;
    if (tool === 'pan' && isRotating && crop) {
      const cx = crop.x + crop.w / 2;
      const cy = crop.y + crop.h / 2;
      const angle = Math.atan2(pos.y - cy, pos.x - cx) * 180 / Math.PI;
      const s = rotateRef.current;
      if (s) {
        const next = s.startRotation + (angle - s.startAngle);
        setRotation(Math.round(next)); // snap to 1°
      }
      return;
    }
    if (crop && dragHandle) {
      const b = tool === 'crop' ? getBounds() : { left: 0, top: 0, right: STAGE_W, bottom: STAGE_H } as const;
      if (!b) return;
      // Normalize current rect to edges
      const left0 = crop.x;
      const top0 = crop.y;
      const right0 = crop.x + Math.abs(crop.w);
      const bottom0 = crop.y + Math.abs(crop.h);
      let left = left0, top = top0, right = right0, bottom = bottom0;
      // Work in axis-aligned space: un-rotate pointer when in pan mode
      const p = tool === 'crop'
        ? clampPoint(pos.x, pos.y)
        : (() => {
          const cfix = resizeRef.current ?? getCenter();
          const un = rotateAround(pos.x, pos.y, cfix.x, cfix.y, -rotation);
          return { x: clamp(un.x, 0, STAGE_W), y: clamp(un.y, 0, STAGE_H) };
        })();
      if (dragHandle === "nw") { left = clamp(p.x, b.left, right0 - 1); top = clamp(p.y, b.top, bottom0 - 1); }
      if (dragHandle === "ne") { right = clamp(p.x, left0 + 1, b.right); top = clamp(p.y, b.top, bottom0 - 1); }
      if (dragHandle === "sw") { left = clamp(p.x, b.left, right0 - 1); bottom = clamp(p.y, top0 + 1, b.bottom); }
      if (dragHandle === "se") { right = clamp(p.x, left0 + 1, b.right); bottom = clamp(p.y, top0 + 1, b.bottom); }
      if (dragHandle === "n") { top = clamp(p.y, b.top, bottom0 - 1); }
      if (dragHandle === "s") { bottom = clamp(p.y, top0 + 1, b.bottom); }
      if (dragHandle === "w") { left = clamp(p.x, b.left, right0 - 1); }
      if (dragHandle === "e") { right = clamp(p.x, left0 + 1, b.right); }
      const x = Math.min(left, right);
      const y = Math.min(top, bottom);
      const w = Math.max(1, Math.abs(right - left));
      const h = Math.max(1, Math.abs(bottom - top));
      if (tool === 'pan') {
        // Live resize in pan mode
        setOffset({ x, y });
        setImgSize({ w, h });
      }
      setBothCrop({ x, y, w, h });
      return;
    }
    // moving the crop rectangle by dragging inside is disabled
    if (isDrawing && crop && drawStart) {
      const p = clampPoint(pos.x, pos.y);
      const x = Math.min(drawStart.x, p.x);
      const y = Math.min(drawStart.y, p.y);
      const w = Math.abs(p.x - drawStart.x);
      const h = Math.abs(p.y - drawStart.y);
      setBothCrop({ x, y, w, h });
    }
  };

  const onMouseUp = (e?: any) => {
    if (e?.evt && typeof e.evt.button === 'number' && e.evt.button !== 0) return;
    if (tool === 'brush' || tool === 'eraser' || tool === 'image-eraser') {
      if (tool === 'image-eraser' && !imgSize) return;
      pushSnapshot({ src, offset, imgSize: imgSize ?? null, crop, rotation, filters, strokes });
      return;
    }
    // cleared legacy panning state (no-op)
    const currentTool = tool;
    const wasResizing = !!dragHandle;
    const wasRotating = isRotating;
    setDragHandle(null);
    setIsDrawing(false);
    setDrawStart(null);
    setIsRotating(false);
    rotateRef.current = null;
    resizeRef.current = null;
    // For pan tool: if we resized via handles, commit size/offset from overlay
    if (currentTool === "pan") {
      if (crop && wasResizing) {
        const c = normCrop(crop);
        const nextOffset = { x: c.x, y: c.y };
        const nextImgSize = { w: c.w, h: c.h };
        setOffset(nextOffset);
        setImgSize(nextImgSize);
        setBothCrop({ x: c.x, y: c.y, w: c.w, h: c.h });
        pushSnapshot({ src, offset: nextOffset, imgSize: nextImgSize, crop: { x: c.x, y: c.y, w: c.w, h: c.h }, rotation, filters, strokes });
      }
      if (wasRotating) {
        pushSnapshot({ src, offset, imgSize: imgSize ?? null, crop, rotation, filters, strokes });
      }
      return;
    }
    // For crop tool, push snapshot after interaction ends
    if (currentTool === "crop") {
      pushSnapshot({ src, offset, imgSize: imgSize ?? null, crop, rotation, filters, strokes });
    }
  };

  // Initialize crop rect when image is ready
  useEffect(() => {
    // When a new image loads, compute aspect-fit (no upscaling), center, initialize overlay and push a baseline snapshot once per src
    if (!image) {
      setBothCrop(null);
      return;
    }
    // If we're skipping fit (e.g., after crop), set size to the new bitmap without changing the Stage view size
    if (skipFitForNextSrcRef.current) {
      const nw = (image as HTMLImageElement).naturalWidth;
      const nh = (image as HTMLImageElement).naturalHeight;
      const placement = pendingCropPlacementRef.current;
      const px = placement?.x ?? 0;
      const py = placement?.y ?? 0;
      const pw = placement?.w ?? nw;
      const ph = placement?.h ?? nh;
      setOffset({ x: px, y: py });
      setImgSize({ w: pw, h: ph });
      setBothCrop({ x: px, y: py, w: pw, h: ph });
      setShowCropUI(true);
      // mark current src as sized to avoid later refit
      lastSizedSrcRef.current = src ?? null;
      skipFitForNextSrcRef.current = false;
      pendingCropPlacementRef.current = null;
      if (!isRestoringRef.current && src !== lastPushedSrcRef.current) {
        pushSnapshot({ src, offset: { x: px, y: py }, imgSize: { w: pw, h: ph }, crop: { x: px, y: py, w: pw, h: ph }, rotation, filters, strokes });
        lastPushedSrcRef.current = src ?? null;
      }
      return;
    }
    // legacy bake path removed
    const nw = (image as HTMLImageElement).naturalWidth;
    const nh = (image as HTMLImageElement).naturalHeight;
    if (!nw || !nh) return;
    // Only perform sizing once for this src
    let snapshotW = imgSize?.w ?? 0;
    let snapshotH = imgSize?.h ?? 0;
    if (src !== lastSizedSrcRef.current) {
      // Measure available viewport for Stage once to fit the image
      const el = containerRef.current;
      const mount = stageMountRef.current;
      let availW = viewSize.w;
      let availH = viewSize.h;
      if (el && mount) {
        const rect = el.getBoundingClientRect();
        const mrect = mount.getBoundingClientRect();
        availW = Math.max(1, Math.floor(rect.width));
        availH = Math.max(1, Math.floor(window.innerHeight - mrect.top - 24));
        // Set view size so Stage uses these dimensions from now on
        setViewSize({ w: availW, h: availH });
      }
  // Fit image to container WIDTH (viewport width on mobile). Do not shrink further due to height.
  const scaleFitW = Math.min(availW / nw, 1);
  let wFit = Math.round(nw * scaleFitW);
  let hFit = Math.round(nh * scaleFitW);
      // Final size constrained by container; prefer width fit
      let finalW = Math.min(availW, wFit);
      let scale2 = finalW / nw;
      let finalH = Math.round(nh * scale2);
      // If width-fit height exceeds available height, fall back to height fit
      if (finalH > availH) {
        scale2 = Math.min(availW / nw, availH / nh, 1);
        finalW = Math.round(nw * scale2);
        finalH = Math.round(nh * scale2);
      }
      // Apply final sizes with smooth animation
      setOffset({ x: 0, y: 0 });
      setShowCropUI(true);
      animateResize(
        { w: viewSize.w, h: viewSize.h },
        { w: finalW, h: finalH },
        300,
        (w, h) => {
          setViewSize({ w, h });
          setImgSize({ w, h });
          setBothCrop({ x: 0, y: 0, w, h });
        }
      );
      lastSizedSrcRef.current = src ?? null;
      snapshotW = finalW; snapshotH = finalH;
    }
    if (!isRestoringRef.current && src !== lastPushedSrcRef.current) {
      // Push baseline snapshot using computed or current imgSize
      const sw = snapshotW || imgSize?.w || Math.round(nw);
      const sh = snapshotH || imgSize?.h || Math.round(nh);
      pushSnapshot({ src, offset: { x: 0, y: 0 }, imgSize: { w: sw, h: sh }, crop: { x: 0, y: 0, w: sw, h: sh }, rotation, filters, strokes });
      lastPushedSrcRef.current = src ?? null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image, src, STAGE_W, STAGE_H]);

  const applyCrop = () => {
    if (!crop || !image || !imgSize) return;
    const stage = stageRef.current;
    if (!stage) return;
    // draw the cropped region to an offscreen canvas sized to the crop
    let { x, y, w, h } = crop;
    if (w < 0) { x += w; w = -w; }
    if (h < 0) { y += h; h = -h; }
    const outW = Math.max(1, Math.round(w));
    const outH = Math.max(1, Math.round(h));
    const off = document.createElement("canvas");
    off.width = outW; off.height = outH;
    const octx = off.getContext("2d");
    if (!octx) return;
    // Translate so that crop.x, crop.y becomes 0,0, then draw the displayed image at its current offset and size
    octx.save();
    octx.translate(-Math.round(x), -Math.round(y));
    octx.drawImage(image, Math.round(offset.x), Math.round(offset.y), imgSize.w, imgSize.h);
    octx.restore();
    const url = off.toDataURL();
    // Set new image; the image-fit effect will compute centered offset, update crop overlay to match,
    // and push a baseline snapshot once the image has loaded.
    skipFitForNextSrcRef.current = true;
    // Preserve placement so new bitmap appears where the crop was
    pendingCropPlacementRef.current = { x: Math.round(x), y: Math.round(y), w: outW, h: outH };
    setSrc(url);
    setBothCrop(null);
  };

  const stageRef = useRef<any>(null);
  const imageGroupRef = useRef<any>(null);

  // chessboard extracted

  // Right sidebar tabs: Background (Pan) and Edit
  const [activeTab, setActiveTab] = useState<'background' | 'edit'>('edit');

  return (
    <div className="max-w-[1200px] mx-auto px-0 md:px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex justify-center gap-2">
          <input
            ref={fileRef}
            className="hidden"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.currentTarget.files?.[0];
              if (!f) return;
              const url = URL.createObjectURL(f);
              const objId = f.name || `obj-${Date.now()}`;
              createOrSelectObject(objId, url);
              // Allow selecting the same file again later
              e.currentTarget.value = "";
            }}
          />
          <Button type="button" onClick={() => fileRef.current?.click()}>Upload</Button>
        </div>
      </div>

  <div className="flex flex-col md:flex-row w-full gap-4 p-2 md:p-8 mx-auto bg-slate-50 border border-slate-200 rounded-md">
        {/* Left: Canvas area */}
        <div ref={containerRef} className="flex-1 w-full">
          <div ref={stageMountRef} />
          <div className="w-full flex justify-center px-2 md:px-0 py-2">
          <Stage ref={stageRef} width={STAGE_W} height={STAGE_H}
            onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
            onTouchStart={onMouseDown} onTouchMove={onMouseMove} onTouchEnd={onMouseUp}
            onTouchCancel={() => { setCursorPos(null); setHoverHandle(null); setHoverRotate(false); }}
            onMouseLeave={() => { setCursorPos(null); setHoverHandle(null); setHoverRotate(false); }}
            className="border border-slate-200 bg-white"
            style={{
              touchAction: 'none',
              display: 'block',
              cursor: (() => {
                if (tool === 'pan' && (dragHandle || isRotating)) return 'grabbing';
                if (tool === 'pan' && hoverRotate) return 'grab';
                if ((tool === 'pan' || tool === 'crop') && hoverHandle) {
                  switch (hoverHandle) {
                    case 'nw': case 'se': return 'nwse-resize';
                    case 'ne': case 'sw': return 'nesw-resize';
                    case 'n': case 's': return 'ns-resize';
                    case 'e': case 'w': return 'ew-resize';
                    default: return 'pointer';
                  }
                }
                if (tool === 'pan') return 'move';
                if (tool === 'crop') return 'crosshair';
                if (tool === 'brush' || tool === 'eraser' || tool === 'image-eraser') return 'crosshair';
                return 'auto';
              })(),
            }}
          >
            <Chessboard width={STAGE_W} height={STAGE_H} grid={gridSize} />
            {(() => {
              const c = crop ? normCrop(crop) : null;
              const clipProps = c ? { clipX: c.x - offset.x, clipY: c.y - offset.y, clipWidth: c.w, clipHeight: c.h } : {};
              return (
                <Layer>
                  <Group
                    ref={imageGroupRef}
                    draggable={tool !== 'crop' && tool !== 'brush' && tool !== 'eraser' && tool !== 'image-eraser' && !dragHandle && !isRotating}
                    x={offset.x}
                    y={offset.y}
                    onDragStart={(e) => {
                      if (dragHandle || isRotating) {
                        e.target.stopDrag();
                      }
                    }}
                    onDragMove={(e) => {
                      const nx = e.target.x();
                      const ny = e.target.y();
                      const dx = nx - offset.x;
                      const dy = ny - offset.y;
                      setOffset({ x: nx, y: ny });
                      // Move existing crop along with the image instead of resetting it
                      if (tool !== 'crop' && crop) {
                        setBothCrop({ x: crop.x + dx, y: crop.y + dy, w: crop.w, h: crop.h });
                      }
                    }}
                    onDragEnd={(e) => {
                      const x = e.target.x();
                      const y = e.target.y();
                      pushSnapshot({ src, offset: { x, y }, imgSize: imgSize ?? null, crop, rotation, filters, strokes });
                    }}
                  >
                    {image && imgSize && (
                      <ImageContent image={image} imgSize={imgSize} imageRef={imageRef} rotation={displayRotation} clip={clipProps as any} strokes={strokes} />
                    )}
                  </Group>
                </Layer>
              );
            })()}
            {/* Drawing layer rendered above image, transformed with image */}
            {imgSize && (
              <DrawingLayer imgSize={imgSize} offset={offset} rotation={displayRotation} listening={tool === 'brush' || tool === 'eraser' || tool === 'image-eraser'} strokes={strokes} />
            )}
            {/* Stage-level drawing overlay for brush/eraser not tied to the image */}
            <StageDrawingOverlay listening={tool === 'brush' || tool === 'eraser'} strokes={strokes} />
            {/* Brush/Eraser cursor preview */}
            {(tool === 'image-eraser') && imgSize && cursorPos && (() => {
              // cursor preview inside image for image-eraser
              const { x: cx, y: cy } = getCenter();
              const un = rotateAround(cursorPos.x, cursorPos.y, cx, cy, -displayRotation);
              const local = { x: un.x - offset.x, y: un.y - offset.y };
              const inside = local.x >= 0 && local.y >= 0 && local.x <= (imgSize?.w ?? 0) && local.y <= (imgSize?.h ?? 0);
              if (!inside) return null;
              const size = imageEraserSize;
              return <CursorPreview imgSize={imgSize} offset={offset} rotation={displayRotation} local={local} size={size} />;
            })()}
            {(tool === 'crop' || tool === 'pan') && crop && showCropUI && (
              <CropOverlay tool={tool as any} imgSize={imgSize ?? null} offset={offset} crop={crop} rotation={rotation} isRotating={isRotating} />
            )}
          </Stage>
          </div>
        </div>
        {/* Right: Sidebar with tabs */}
  <aside className="w-full md:w-80 shrink-0">
          {/* Tabs header */}
          <div className="flex rounded-md overflow-hidden border border-slate-200 mb-3">
            <button
              className={`flex-1 px-3 py-2 text-sm ${activeTab === 'background' ? 'bg-slate-200 font-medium' : 'bg-white hover:bg-slate-50'}`}
              onClick={() => { setActiveTab('background'); if (tool !== 'pan') setTool('pan'); }}
            >
              Background (Pan)
            </button>
            <button
              className={`flex-1 px-3 py-2 text-sm ${activeTab === 'edit' ? 'bg-slate-200 font-medium' : 'bg-white hover:bg-slate-50'}`}
              onClick={() => setActiveTab('edit')}
            >
              Edit
            </button>
          </div>

          <div className="border border-slate-200 rounded-md p-3 bg-white max-h-[70vh] overflow-auto">
            {activeTab === 'background' ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">Use Pan to move and resize the image. Drag handles on the selection to resize, or the top handle to rotate.</p>
                <div className="flex gap-2">
                  <Button variant={tool === 'pan' ? 'default' : 'outline'} onClick={() => setTool('pan')}>Activate Pan</Button>
                </div>
              </div>
            ) : (
              <Toolbar
                tool={tool}
                setTool={(next) => {
                  if (next === tool) return;
                  if (!image && next === 'image-eraser') return;
                  // Leaving current tool
                  if (tool === 'crop') {
                    const cur = crop ? normCrop(crop) : null;
                    const prev = previousCropRef.current;
                    const eq = !!cur && !!prev && cur.x === prev.x && cur.y === prev.y && cur.w === prev.w && cur.h === prev.h;
                    if (crop && !eq) {
                      applyCrop();
                    }
                  }
                  setTool(next);
                  if (next === 'crop') {
                    if (imgSize) {
                      const full = { x: offset.x, y: offset.y, w: imgSize.w, h: imgSize.h };
                      setBothCrop(full);
                      setShowCropUI(true);
                      previousCropRef.current = { ...full };
                    }
                  } else if (next === 'pan') {
                    previousCropRef.current = null;
                  }
                }}
                onResetCrop={() => {
                  const next = imgSize ? { x: offset.x, y: offset.y, w: imgSize.w, h: imgSize.h } : null;
                  setBothCrop(next);
                  pushSnapshot({ src, offset, imgSize: imgSize ?? null, crop: next, rotation, filters, strokes });
                }}
                hasImage={!!image}
                onUndo={() => { isRestoringRef.current = true; undo(); setTimeout(() => { isRestoringRef.current = false; }, 0); }}
                onRedo={() => { isRestoringRef.current = true; redo(); setTimeout(() => { isRestoringRef.current = false; }, 0); }}
                canUndo={canUndo}
                canRedo={canRedo}
                filters={filters}
                setFilters={(f: any) => setFilters(typeof f === 'function' ? f(filters) : f)}
                brushColor={brushColor}
                brushSize={brushSize}
                eraserSize={eraserSize}
                imageEraserSize={imageEraserSize}
                setImageEraserSize={setImageEraserSize}
                setBrushColor={setBrushColor}
                setBrushSize={setBrushSize}
                setEraserSize={setEraserSize}
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}