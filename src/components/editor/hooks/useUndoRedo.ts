import { useCallback, useMemo, useRef, useState } from "react";

export function useUndoRedo<T>(initial: T) {
  const [present, setPresent] = useState<T>(initial);
  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);

  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  const push = useCallback((next: T) => {
    pastRef.current.push(present);
    setPresent(next);
    futureRef.current = [];
  }, [present]);

  const undo = useCallback(() => {
    if (!canUndo) return undefined as unknown as T;
    const prev = pastRef.current.pop() as T;
    futureRef.current.push(present);
    setPresent(prev);
    return prev;
  }, [present, canUndo]);

  const redo = useCallback(() => {
    if (!canRedo) return undefined as unknown as T;
    const next = futureRef.current.pop() as T;
    pastRef.current.push(present);
    setPresent(next);
    return next;
  }, [present, canRedo]);

  const reset = useCallback((state: T) => {
    pastRef.current = [];
    futureRef.current = [];
    setPresent(state);
  }, []);

  return { present, setPresent, canUndo, canRedo, push, undo, redo, reset } as const;
}
