

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "physicshub.slidePosition";

interface StoredPosition {
  lessonId: string;
  index: number;
  updatedAt: number;
}

function readPosition(lessonId: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as Partial<StoredPosition>;
    if (
      parsed &&
      parsed.lessonId === lessonId &&
      typeof parsed.index === "number" &&
      Number.isFinite(parsed.index) &&
      parsed.index >= 0
    ) {
      return Math.floor(parsed.index);
    }
  } catch {
    
  }
  return 0;
}

function writePosition(lessonId: string, index: number): void {
  if (typeof window === "undefined") return;
  try {
    const data: StoredPosition = {
      lessonId,
      index,
      updatedAt: Date.now(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    
  }
}

export function useSlidePosition(lessonId: string): {
  position: number;
  setPosition: (index: number) => void;
  reset: () => void;
} {
  const [position, setPositionState] = useState<number>(0);

  useEffect(() => {
    setPositionState(readPosition(lessonId));
  }, [lessonId]);

  const setPosition = useCallback(
    (index: number) => {
      const safe = Math.max(0, Math.floor(index));
      setPositionState(safe);
      writePosition(lessonId, safe);
    },
    [lessonId],
  );

  const reset = useCallback(() => {
    setPositionState(0);
    writePosition(lessonId, 0);
  }, [lessonId]);

  return { position, setPosition, reset };
}
