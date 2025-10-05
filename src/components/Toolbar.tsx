"use client";
import * as React from "react";
import { Button } from "./ui/button";
import { FaHandPaper, FaCrop, FaPaintBrush, FaEraser, FaRegImage, FaUndo, FaRedo, FaSlidersH } from "react-icons/fa";
import { Tooltip } from "./ui/tooltip";

// Helper for tooltips
function ToolTipWrap({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip content={label} side="bottom" delayDuration={300}>
      {children}
    </Tooltip>
  );
}

export function Toolbar({
  tool,
  setTool,
  onResetCrop,
  hasImage,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  filters,
  setFilters,
  brushColor,
  brushSize,
  eraserSize,
  setBrushColor,
  setBrushSize,
  setEraserSize,
  imageEraserSize,
  setImageEraserSize,
}: {
  tool: "pan" | "crop" | "brush" | "eraser" | "image-eraser";
  setTool: (t: "pan" | "crop" | "brush" | "eraser" | "image-eraser") => void;
  onResetCrop: () => void;
  hasImage: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  filters: any;
  setFilters: (f: any) => void;
  brushColor: string;
  brushSize: number;
  eraserSize: number;
  setBrushColor: (c: string) => void;
  setBrushSize: (n: number) => void;
  setEraserSize: (n: number) => void;
  imageEraserSize?: number;
  setImageEraserSize?: (n: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-2 items-center bg-slate-50/80 rounded-lg px-4 py-2 shadow-sm border border-slate-200">
      {/* Tool group */}
      <div className="flex gap-1 items-center">
        <ToolTipWrap label="Pan (move image)">
          <Button variant={tool === "pan" ? "default" : "outline"} onClick={() => setTool("pan")}
            className="flex items-center justify-center w-9 h-9 p-0" aria-label="Pan">
            <FaHandPaper className="text-lg" />
          </Button>
        </ToolTipWrap>
        <ToolTipWrap label="Crop">
          <Button variant={tool === "crop" ? "default" : "outline"} onClick={() => setTool("crop")}
            className="flex items-center justify-center w-9 h-9 p-0" aria-label="Crop">
            <FaCrop className="text-lg" />
          </Button>
        </ToolTipWrap>
        <span className="mx-1 h-6 w-px bg-slate-200 rounded" />
        <ToolTipWrap label="Brush">
          <Button variant={tool === "brush" ? "default" : "outline"} onClick={() => setTool("brush")}
            className="flex items-center justify-center w-9 h-9 p-0" aria-label="Brush">
            <FaPaintBrush className="text-lg" />
          </Button>
        </ToolTipWrap>
        <ToolTipWrap label="Eraser">
          <Button variant={tool === "eraser" ? "default" : "outline"} onClick={() => setTool("eraser")}
            className="flex items-center justify-center w-9 h-9 p-0" aria-label="Eraser">
            <FaEraser className="text-lg" />
          </Button>
        </ToolTipWrap>
        <ToolTipWrap label="Image Eraser (erase image pixels)">
          <Button variant={tool === "image-eraser" ? "default" : "outline"} onClick={() => setTool("image-eraser")} disabled={!hasImage}
            className="flex items-center justify-center w-9 h-9 p-0" aria-label="Image Eraser">
            <FaRegImage className="text-lg" />
          </Button>
        </ToolTipWrap>
      </div>
      {tool === "crop" && (
        <ToolTipWrap label="Reset Crop">
          <Button variant="outline" onClick={onResetCrop} disabled={!hasImage} className="ml-2">
            Reset Crop
          </Button>
        </ToolTipWrap>
      )}
      <span className="mx-2 h-6 w-px bg-slate-200 rounded hidden sm:inline-block" />
      {/* Undo/Redo group */}
      <div className="flex gap-1 ml-auto">
        <ToolTipWrap label="Undo">
          <Button variant="outline" onClick={onUndo} disabled={!canUndo} className="w-9 h-9 p-0">
            <FaUndo />
          </Button>
        </ToolTipWrap>
        <ToolTipWrap label="Redo">
          <Button variant="outline" onClick={onRedo} disabled={!canRedo} className="w-9 h-9 p-0">
            <FaRedo />
          </Button>
        </ToolTipWrap>
      </div>

      {/* Drawing settings */}
      {(tool === 'brush' || tool === 'eraser' || tool === 'image-eraser') && (
        <div className="w-full flex flex-wrap gap-3 items-center mt-2 bg-white/80 rounded px-3 py-2 border border-slate-100">
          {tool === 'brush' && (
            <>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-xs text-slate-600">Color</span>
                <input type="color" value={brushColor} onChange={e => setBrushColor(e.target.value)} className="w-6 h-6 border-0 bg-transparent" />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-xs text-slate-600">Size</span>
                <input type="range" min={1} max={64} value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} className="accent-blue-500" />
                <span className="text-xs text-slate-600 w-8 text-right">{brushSize}</span>
              </label>
            </>
          )}
          {(tool === 'eraser' || tool === 'image-eraser') && (
            <label className="flex items-center gap-2 text-sm">
              <span className="text-xs text-slate-600">Size</span>
              <input type="range" min={4} max={128} value={(tool === 'image-eraser' ? (imageEraserSize ?? eraserSize) : eraserSize)} onChange={e => (tool === 'image-eraser' ? setImageEraserSize?.(Number(e.target.value)) : setEraserSize(Number(e.target.value)))} className="accent-pink-500" />
              <span className="text-xs text-slate-600 w-8 text-right">{tool === 'image-eraser' ? (imageEraserSize ?? eraserSize) : eraserSize}</span>
            </label>
          )}
        </div>
      )}

      {/* Filters */}
      {hasImage && (
        <div className="w-full flex flex-wrap gap-2 items-center mt-2 bg-white/80 rounded px-3 py-2 border border-slate-100">
          <span className="text-sm text-slate-600 flex items-center gap-1"><FaSlidersH className="opacity-60" /> Filters:</span>
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={filters.enabled.grayscale} onChange={e => setFilters({ enabled: { ...filters.enabled, grayscale: e.target.checked }})} /> Grayscale
          </label>
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={filters.enabled.sepia} onChange={e => setFilters({ enabled: { ...filters.enabled, sepia: e.target.checked }})} /> Sepia
          </label>
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={filters.enabled.invert} onChange={e => setFilters({ enabled: { ...filters.enabled, invert: e.target.checked }})} /> Invert
          </label>
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={filters.enabled.blur} onChange={e => setFilters({ enabled: { ...filters.enabled, blur: e.target.checked }})} /> Blur
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">Radius</span>
            <input type="range" min={0} max={30} value={filters.blurRadius} onChange={e => setFilters({ blurRadius: Number(e.target.value) })} className="accent-purple-500" />
          </div>
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={filters.enabled.brightness} onChange={e => setFilters({ enabled: { ...filters.enabled, brightness: e.target.checked }})} /> Brightness
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">Level</span>
            <input type="range" min={-1} max={2} step={0.01} value={filters.brightness} onChange={e => setFilters({ brightness: Number(e.target.value) })} className="accent-yellow-500" />
          </div>
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={filters.enabled.contrast} onChange={e => setFilters({ enabled: { ...filters.enabled, contrast: e.target.checked }})} /> Contrast
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">Level</span>
            <input type="range" min={-100} max={100} value={filters.contrast} onChange={e => setFilters({ contrast: Number(e.target.value) })} className="accent-green-500" />
          </div>
        </div>
      )}
    </div>
  );
}
