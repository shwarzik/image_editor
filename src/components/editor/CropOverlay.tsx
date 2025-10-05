"use client";
import React from "react";
import { Group, Layer, Rect, Circle, Text } from "react-konva";
import { HANDLE_VISUAL_RADIUS, ROTATE_HANDLE_OFFSET } from "./constants";

export function CropOverlay({
  tool,
  imgSize,
  offset,
  crop,
  rotation,
  isRotating,
}: {
  tool: 'pan' | 'crop';
  imgSize: { w: number; h: number } | null;
  offset: { x: number; y: number };
  crop: { x: number; y: number; w: number; h: number };
  rotation: number;
  isRotating: boolean;
}) {
  if (!crop) return null as any;
  return (
    <Layer listening={tool === 'crop'}>
      {tool === 'pan' && imgSize ? (
        <Group x={offset.x} y={offset.y}>
          <Group rotation={rotation} offsetX={imgSize.w / 2} offsetY={imgSize.h / 2} x={imgSize.w / 2} y={imgSize.h / 2}>
            {(() => {
              const localX = crop.x - offset.x;
              const localY = crop.y - offset.y;
              return (
                <>
                  <Rect x={localX} y={localY} width={crop.w} height={crop.h} stroke="#00aaff" dash={[8, 6]} strokeWidth={2} />
                  <Group>
                    <Circle x={localX} y={localY} radius={HANDLE_VISUAL_RADIUS} fill="#fff" stroke="#00aaff" strokeWidth={2} />
                    <Circle x={localX + crop.w} y={localY} radius={HANDLE_VISUAL_RADIUS} fill="#fff" stroke="#00aaff" strokeWidth={2} />
                    <Circle x={localX} y={localY + crop.h} radius={HANDLE_VISUAL_RADIUS} fill="#fff" stroke="#00aaff" strokeWidth={2} />
                    <Circle x={localX + crop.w} y={localY + crop.h} radius={HANDLE_VISUAL_RADIUS} fill="#fff" stroke="#00aaff" strokeWidth={2} />
                    <Circle x={localX + crop.w / 2} y={localY} radius={HANDLE_VISUAL_RADIUS} fill="#fff" stroke="#00aaff" strokeWidth={2} />
                    <Circle x={localX + crop.w / 2} y={localY + crop.h} radius={HANDLE_VISUAL_RADIUS} fill="#fff" stroke="#00aaff" strokeWidth={2} />
                    <Circle x={localX} y={localY + crop.h / 2} radius={HANDLE_VISUAL_RADIUS} fill="#fff" stroke="#00aaff" strokeWidth={2} />
                    <Circle x={localX + crop.w} y={localY + crop.h / 2} radius={HANDLE_VISUAL_RADIUS} fill="#fff" stroke="#00aaff" strokeWidth={2} />
                    <Group>
                      <Rect x={localX + crop.w / 2 - 1} y={localY - ROTATE_HANDLE_OFFSET + HANDLE_VISUAL_RADIUS} width={2} height={ROTATE_HANDLE_OFFSET - HANDLE_VISUAL_RADIUS} fill="#00aaff" />
                      <Circle x={localX + crop.w / 2} y={localY - ROTATE_HANDLE_OFFSET} radius={HANDLE_VISUAL_RADIUS} fill="#fff" stroke="#00aaff" strokeWidth={2} />
                    </Group>
                  </Group>
                </>
              );
            })()}
          </Group>
        </Group>
      ) : (
        <Group>
          <Rect x={crop.x} y={crop.y} width={crop.w} height={crop.h} stroke="#00aaff" dash={[8, 6]} strokeWidth={2} />
          <Group>
            <Circle x={crop.x} y={crop.y} radius={HANDLE_VISUAL_RADIUS} fill="#fff" stroke="#00aaff" strokeWidth={2} />
            <Circle x={crop.x + crop.w} y={crop.y} radius={HANDLE_VISUAL_RADIUS} fill="#fff" stroke="#00aaff" strokeWidth={2} />
            <Circle x={crop.x} y={crop.y + crop.h} radius={HANDLE_VISUAL_RADIUS} fill="#fff" stroke="#00aaff" strokeWidth={2} />
            <Circle x={crop.x + crop.w} y={crop.y + crop.h} radius={HANDLE_VISUAL_RADIUS} fill="#fff" stroke="#00aaff" strokeWidth={2} />
            <Circle x={crop.x + crop.w / 2} y={crop.y} radius={HANDLE_VISUAL_RADIUS} fill="#fff" stroke="#00aaff" strokeWidth={2} />
            <Circle x={crop.x + crop.w / 2} y={crop.y + crop.h} radius={HANDLE_VISUAL_RADIUS} fill="#fff" stroke="#00aaff" strokeWidth={2} />
            <Circle x={crop.x} y={crop.y + crop.h / 2} radius={HANDLE_VISUAL_RADIUS} fill="#fff" stroke="#00aaff" strokeWidth={2} />
            <Circle x={crop.x + crop.w} y={crop.y + crop.h / 2} radius={HANDLE_VISUAL_RADIUS} fill="#fff" stroke="#00aaff" strokeWidth={2} />
          </Group>
        </Group>
      )}
    </Layer>
  );
}
