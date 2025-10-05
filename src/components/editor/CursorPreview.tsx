"use client";
import React from "react";
import { Circle, Group, Layer } from "react-konva";

export function CursorPreview({
  imgSize,
  offset,
  rotation,
  local,
  size,
}: {
  imgSize: { w: number; h: number } | null;
  offset: { x: number; y: number };
  rotation: number;
  local: { x: number; y: number };
  size: number;
}) {
  if (!imgSize) return null;
  return (
    <Layer listening={false}>
      <Group x={offset.x} y={offset.y}>
        <Group rotation={rotation} offsetX={imgSize.w / 2} offsetY={imgSize.h / 2} x={imgSize.w / 2} y={imgSize.h / 2}>
          <Circle x={local.x} y={local.y} radius={size / 2} stroke="#111827" strokeWidth={1} opacity={0.9} listening={false} />
        </Group>
      </Group>
    </Layer>
  );
}
