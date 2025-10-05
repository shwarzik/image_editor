"use client";
import { create } from "zustand";

type ViewSize = { w: number; h: number };
type CropRect = { x: number; y: number; w: number; h: number } | null;
type Vec2 = { x: number; y: number };
type Size = { w: number; h: number } | null;

// Konva filter configuration stored in history and per-object mods
export type FiltersState = {
  enabled: {
    blur: boolean;
    brighten: boolean; // Konva.Filters.Brighten (additive)
    brightness: boolean; // Konva.Filters.Brightness (multiplicative, CSS-like)
    contrast: boolean;
    emboss: boolean;
    enhance: boolean;
    grayscale: boolean;
    hsl: boolean;
    hsv: boolean;
    invert: boolean;
    noise: boolean;
    pixelate: boolean;
    posterize: boolean;
    rgb: boolean;
    rgba: boolean;
    sepia: boolean;
    solarize: boolean;
    threshold: boolean;
    mask: boolean;
  };
  // parameters
  blurRadius: number; // px
  brightness: number; // shared slider for Brighten/Brightness filters
  contrast: number; // -100..100 typical
  embossStrength: number; // 0..1
  embossWhiteLevel: number; // 0..1
  embossDirection: 'top-left' | 'top' | 'top-right' | 'right' | 'bottom-right' | 'bottom' | 'bottom-left' | 'left';
  embossBlend: boolean;
  enhance: number; // 0..1
  hue: number; // -180..180
  saturation: number; // -1..1 or -100..100 depending on filter
  luminance: number; // -1..1
  value: number; // 0..255 for HSV value
  noise: number; // 0..1
  pixelSize: number; // >=1
  levels: number; // 0..1 for posterize (normalized)
  red: number; // 0..255
  green: number; // 0..255
  blue: number; // 0..255
  alpha: number; // 0..1
  threshold: number; // 0..1
  maskThreshold: number; // 0..255 for Mask
};

export const DEFAULT_FILTERS: FiltersState = {
  enabled: {
    blur: false,
    brighten: false,
    brightness: false,
    contrast: false,
    emboss: false,
    enhance: false,
    grayscale: false,
    hsl: false,
    hsv: false,
    invert: false,
    noise: false,
    pixelate: false,
    posterize: false,
    rgb: false,
    rgba: false,
    sepia: false,
    solarize: false,
    threshold: false,
    mask: false,
  },
  blurRadius: 0,
  brightness: 0,
  contrast: 0,
  embossStrength: 0.5,
  embossWhiteLevel: 0.5,
  embossDirection: 'top-left',
  embossBlend: true,
  enhance: 0,
  hue: 0,
  saturation: 0,
  luminance: 0,
  value: 0,
  noise: 0,
  pixelSize: 1,
  levels: 0.5,
  red: 255,
  green: 255,
  blue: 255,
  alpha: 1,
  threshold: 0.5,
  maskThreshold: 128,
};

export type Snapshot = {
  src: string | null;
  offset: Vec2;
  imgSize: Size;
  crop: CropRect;
  rotation: number;
  filters: FiltersState;
  strokes: Stroke[];
};

type EditorObjectMods = {
  offset: Vec2;
  imgSize: Size;
  crop: CropRect;
  rotation: number;
  filters: FiltersState;
  strokes: Stroke[];
};

type EditorObject = {
  id: string;
  src: string | null;
  mods: EditorObjectMods;
};

export type StrokePoint = { x: number; y: number };
export type Stroke = {
  id: string;
  tool: 'brush' | 'eraser' | 'image-eraser';
  color?: string;
  size: number;
  points: StrokePoint[];
  baseSize?: { w: number; h: number };
  coordinateSpace?: 'stage' | 'image';
};

type EditorStore = {
  imageSrc: string | null;
  setImageSrc: (s: string | null) => void;
  viewSize: ViewSize;
  setViewSize: (v: ViewSize) => void;
  crop: CropRect;
  setCrop: (c: CropRect) => void;
  tool: "pan" | "crop" | "brush" | "eraser" | "image-eraser";
  setTool: (t: "pan" | "crop" | "brush" | "eraser" | "image-eraser") => void;
  offset: Vec2;
  setOffset: (v: Vec2) => void;
  imgSize: Size;
  setImgSize: (s: NonNullable<Size> | null) => void;
  rotation: number;
  setRotation: (r: number) => void;
  filters: FiltersState;
  setFilters: (f: Partial<FiltersState> | ((prev: FiltersState) => FiltersState)) => void;
  // drawing
  strokes: Stroke[];
  setStrokes: (s: Stroke[] | ((prev: Stroke[]) => Stroke[])) => void;
  brushColor: string;
  brushSize: number;
  eraserSize: number;
  imageEraserSize: number;
  setBrushColor: (c: string) => void;
  setBrushSize: (n: number) => void;
  setEraserSize: (n: number) => void;
  setImageEraserSize: (n: number) => void;
  // objects and per-object mods
  objects: Record<string, EditorObject>;
  currentObjectId: string | null;
  createOrSelectObject: (id: string, src?: string | null) => void;
  saveCurrentMods: () => void;
  // history state
  past: Snapshot[];
  present: Snapshot;
  future: Snapshot[];
  canUndo: boolean;
  canRedo: boolean;
  pushSnapshot: (s: Snapshot) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  clearCrop: () => void;
};

const DEFAULT_WIDTH = 500;
const DEFAULT_HEIGHT = 500;

const initialSnapshot: Snapshot = {
  src: null,
  offset: { x: 0, y: 0 },
  imgSize: null,
  crop: null,
  rotation: 0,
  filters: DEFAULT_FILTERS,
  strokes: [],
};

export const useEditorStore = create<EditorStore>((set, get) => ({
  // internal: optional cap to prevent unbounded growth; set to 0 for unlimited
  _MAX_HISTORY: 500,
  imageSrc: null,
  setImageSrc: (s: string | null) => {
    const { currentObjectId, objects } = get();
    if (currentObjectId) {
      const obj = objects[currentObjectId];
      if (obj) {
        const updated: EditorObject = { ...obj, src: s ?? null };
        set({ imageSrc: s, objects: { ...objects, [currentObjectId]: updated } });
        return;
      }
    }
    set({ imageSrc: s });
  },

  viewSize: { w: DEFAULT_WIDTH, h: DEFAULT_HEIGHT },
  setViewSize: (v: ViewSize) => set({ viewSize: v }),

  crop: null,
  setCrop: (c: CropRect) => {
    set({ crop: c });
    const { currentObjectId, objects } = get();
    if (currentObjectId && objects[currentObjectId]) {
      const o = objects[currentObjectId];
      const mods = { ...o.mods, crop: c };
      set({ objects: { ...objects, [currentObjectId]: { ...o, mods } } });
    }
  },

  tool: "pan",
  setTool: (t: "pan" | "crop" | "brush" | "eraser" | "image-eraser") => set({ tool: t }),

  offset: { x: 0, y: 0 },
  setOffset: (v: Vec2) => {
    set({ offset: v });
    const { currentObjectId, objects } = get();
    if (currentObjectId && objects[currentObjectId]) {
      const o = objects[currentObjectId];
      const mods = { ...o.mods, offset: v };
      set({ objects: { ...objects, [currentObjectId]: { ...o, mods } } });
    }
  },

  imgSize: null,
  setImgSize: (s: Size) => {
    set({ imgSize: s });
    const { currentObjectId, objects } = get();
    if (currentObjectId && objects[currentObjectId]) {
      const o = objects[currentObjectId];
      const mods = { ...o.mods, imgSize: s };
      set({ objects: { ...objects, [currentObjectId]: { ...o, mods } } });
    }
  },

  rotation: 0,
  setRotation: (r: number) => {
    set({ rotation: r });
    const { currentObjectId, objects } = get();
    if (currentObjectId && objects[currentObjectId]) {
      const o = objects[currentObjectId];
      const mods = { ...o.mods, rotation: r };
      set({ objects: { ...objects, [currentObjectId]: { ...o, mods } } });
    }
  },

  filters: DEFAULT_FILTERS,
  setFilters: (f: Partial<FiltersState> | ((prev: FiltersState) => FiltersState)) => {
    const prev = get().filters;
    const next = typeof f === 'function' ? (f as any)(prev) : { ...prev, ...f };
    set({ filters: next });
    const { currentObjectId, objects } = get();
    if (currentObjectId && objects[currentObjectId]) {
      const o = objects[currentObjectId];
      const mods = { ...o.mods, filters: next };
      set({ objects: { ...objects, [currentObjectId]: { ...o, mods } } });
    }
  },

  // drawing state
  strokes: [],
  setStrokes: (s: Stroke[] | ((prev: Stroke[]) => Stroke[])) => {
    const prev = get().strokes;
    const next = typeof s === 'function' ? (s as any)(prev) : s;
    set({ strokes: next });
    const { currentObjectId, objects } = get();
    if (currentObjectId && objects[currentObjectId]) {
      const o = objects[currentObjectId];
      const mods = { ...o.mods, strokes: next };
      set({ objects: { ...objects, [currentObjectId]: { ...o, mods } } });
    }
  },
  brushColor: '#ff0000',
  brushSize: 8,
  eraserSize: 24,
  imageEraserSize: 48,
  setBrushColor: (c: string) => set({ brushColor: c }),
  setBrushSize: (n: number) => set({ brushSize: n }),
  setEraserSize: (n: number) => set({ eraserSize: n }),
  setImageEraserSize: (n: number) => set({ imageEraserSize: n }),

  // objects
  objects: {},
  currentObjectId: null,
  createOrSelectObject: (id: string, src?: string | null) => {
    const state = get();
    const objects = { ...state.objects };
    if (!objects[id]) {
      objects[id] = {
        id,
        src: src ?? null,
        mods: {
          offset: state.offset,
          imgSize: state.imgSize,
          crop: state.crop,
          rotation: state.rotation,
          filters: state.filters,
          strokes: state.strokes,
        },
      };
    } else if (src !== undefined) {
      objects[id] = { ...objects[id], src };
    }
    // Update selection and mirror fields, but let the image-load effect push the baseline snapshot
    const mods = objects[id].mods;
    set({
      objects,
      currentObjectId: id,
      // mirror fields
      imageSrc: objects[id].src,
      offset: mods.offset,
      imgSize: mods.imgSize,
      crop: mods.crop,
      rotation: mods.rotation,
      filters: mods.filters,
      strokes: mods.strokes ?? [],
      // Don't modify history here; the image load will push a proper baseline snapshot
    });
  },
  saveCurrentMods: () => {
    const { currentObjectId, objects, offset, imgSize, crop, rotation, filters, strokes } = get();
    if (!currentObjectId) return;
    const obj = objects[currentObjectId];
    if (!obj) return;
    const updated: EditorObject = {
      ...obj,
      mods: { offset, imgSize, crop, rotation, filters, strokes },
    };
    set({ objects: { ...objects, [currentObjectId]: updated } });
  },

  past: [],
  present: initialSnapshot,
  future: [],
  canUndo: false,
  canRedo: false,

  pushSnapshot: (s: Snapshot) => {
    const { present, past, _MAX_HISTORY } = get() as any;
    // append present to past and optionally cap history
    const appended = [...past, present];
    const overflow = _MAX_HISTORY > 0 ? Math.max(0, appended.length - _MAX_HISTORY) : 0;
    const newPast = overflow > 0 ? appended.slice(overflow) : appended;
    set({
      past: newPast,
      present: s,
      future: [],
      // mirror fields
      imageSrc: s.src,
      offset: s.offset,
      imgSize: s.imgSize,
      crop: s.crop,
      rotation: s.rotation,
      filters: s.filters,
      strokes: s.strokes ?? [],
      canUndo: newPast.length > 0,
      canRedo: false,
    });
    // Also persist to current object's mods
    const { saveCurrentMods } = get();
    saveCurrentMods();
  },

  undo: () => {
    const { past, present, future } = get();
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    const newPast = past.slice(0, -1);
    const newFuture = [...future, present];
    set({
      past: newPast,
      present: prev,
      future: newFuture,
      imageSrc: prev.src,
      offset: prev.offset,
      imgSize: prev.imgSize,
      crop: prev.crop,
      rotation: prev.rotation,
      filters: prev.filters,
      strokes: prev.strokes ?? [],
      canUndo: newPast.length > 0,
      canRedo: true,
    });
    const { saveCurrentMods } = get();
    saveCurrentMods();
  },

  redo: () => {
    const { past, present, future } = get();
    if (future.length === 0) return;
    const next = future[future.length - 1];
    const newFuture = future.slice(0, -1);
    const newPast = [...past, present];
    set({
      past: newPast,
      present: next,
      future: newFuture,
      imageSrc: next.src,
      offset: next.offset,
      imgSize: next.imgSize,
      crop: next.crop,
      rotation: next.rotation,
      filters: next.filters,
      strokes: next.strokes ?? [],
      canUndo: newPast.length > 0,
      canRedo: newFuture.length > 0,
    });
    const { saveCurrentMods } = get();
    saveCurrentMods();
  },

  reset: () => {
    set({
      imageSrc: null,
      viewSize: { w: DEFAULT_WIDTH, h: DEFAULT_HEIGHT },
      crop: null,
      tool: "pan",
      offset: { x: 0, y: 0 },
      imgSize: null,
      rotation: 0,
      past: [],
      present: initialSnapshot,
      future: [],
      canUndo: false,
      canRedo: false,
      objects: {},
      currentObjectId: null,
    });
  },

  clearCrop: () => set({ crop: null }),
}));

export type { ViewSize, CropRect };
