"use client";
import React from "react";
import { Rect, Layer } from "react-konva";

export function Chessboard({ width, height, grid = 32 }: { width: number; height: number; grid?: number }) {
  const cells: React.ReactElement[] = [];
  for (let y = 0; y < height; y += grid) {
    for (let x = 0; x < width; x += grid) {
      const even = ((x / grid + y / grid) % 2 === 0);
      cells.push(
        <Rect key={`r-${x}-${y}`} x={x} y={y} width={grid} height={grid} fill={even ? "#f3f4f6" : "#e5e7eb"} />
      );
    }
  }
  return <Layer>{cells}</Layer>;
}
