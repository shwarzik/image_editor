"use client";
import React from "react";
import { Group, Layer, Line } from "react-konva";
import type { Stroke } from "@/store/EditorStore";
import { scaleStroke } from "./utils/strokes";

// Image-space drawing (legacy): follows image transforms
export function DrawingLayer({
  imgSize,
  offset,
  rotation,
  listening,
  strokes,
}: {
  imgSize: { w: number; h: number } | null;
  offset: { x: number; y: number };
  rotation: number;
  listening: boolean;
  strokes: Stroke[];
}) {
  if (!imgSize) return null;
  return (
    <Layer listening={listening}>
      <Group x={offset.x} y={offset.y}>
        <Group rotation={rotation} offsetX={imgSize.w / 2} offsetY={imgSize.h / 2} x={imgSize.w / 2} y={imgSize.h / 2}>
          {strokes.filter(s => s.coordinateSpace !== 'stage' && s.tool !== 'image-eraser').map(s => {
            const { points, width } = scaleStroke(s, imgSize);
            return (
              <Line key={s.id}
                points={points}
                stroke={s.tool === 'brush' ? (s.color || '#000') : '#000'}
                strokeWidth={width}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation={s.tool === 'eraser' ? 'destination-out' as any : 'source-over'}
                listening={false}
              />
            );
          })}
        </Group>
      </Group>
    </Layer>
  );
}

// Stage-space overlay drawing: fixed to the canvas, not tied to image
export function StageDrawingOverlay({
  listening,
  strokes,
}: {
  listening: boolean;
  strokes: Stroke[];
}) {
  return (
    <Layer listening={listening}>
      <Group>
        {strokes.filter(s => s.coordinateSpace === 'stage' && s.tool !== 'image-eraser').map(s => (
          <Line key={s.id}
            points={s.points.flatMap(p => [p.x, p.y])}
            stroke={s.tool === 'brush' ? (s.color || '#000') : '#000'}
            strokeWidth={s.size}
            lineCap="round"
            lineJoin="round"
            globalCompositeOperation={s.tool === 'eraser' ? 'destination-out' as any : 'source-over'}
            listening={false}
          />
        ))}
      </Group>
    </Layer>
  );
}
