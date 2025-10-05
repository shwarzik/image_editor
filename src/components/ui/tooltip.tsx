"use client";
import * as React from "react";

// Simple tooltip using native title attribute fallback
export function Tooltip({ content, children, side, delayDuration }: {
  content: string;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  delayDuration?: number;
}) {
  // For a real app, replace with Radix UI or Headless UI tooltip for better UX
  return (
    <span style={{ position: "relative", display: "inline-block" }} title={content}>
      {children}
    </span>
  );
}
