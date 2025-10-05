"use client";
import React from "react";
import { Group, Image as KonvaImage, Line } from "react-konva";
import { scaleStroke } from "./utils/strokes";
import type { Stroke } from "@/store/EditorStore";

export function ImageContent({
  image,
  imgSize,
  imageRef,
  rotation,
  clip,
  strokes,
}: {
  image: HTMLImageElement | null;
  imgSize: { w: number; h: number } | null;
  imageRef: any;
  rotation: number;
  clip?: { clipX: number; clipY: number; clipWidth: number; clipHeight: number };
  strokes: Stroke[];
}) {
  if (!image || !imgSize) return null;
  return (
    <Group rotation={rotation} offsetX={imgSize.w / 2} offsetY={imgSize.h / 2} x={imgSize.w / 2} y={imgSize.h / 2} {...(clip || {})}>
      <KonvaImage ref={imageRef} image={image} x={0} y={0} width={imgSize.w} height={imgSize.h} listening={false} />
      {strokes.filter((s) => s.tool === 'image-eraser').map((s) => {
        const { points, width } = scaleStroke(s, imgSize);
        return (
          <Line key={`ie-${s.id}`}
            points={points}
            stroke={'#000'}
            strokeWidth={width}
            lineCap="round"
            lineJoin="round"
            globalCompositeOperation={'destination-out' as any}
            listening={false}
          />
        );
      })}
    </Group>
  );
}
