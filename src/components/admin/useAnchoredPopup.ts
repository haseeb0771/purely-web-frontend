"use client";

import { useCallback, useState, type RefObject } from "react";

export interface PopupPosition {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
}

const MARGIN = 8;

export function useAnchoredPopup(
  anchorRef: RefObject<HTMLElement | null>,
  popupWidth: number,
  estimatedHeight: number
) {
  const [position, setPosition] = useState<PopupPosition | null>(null);

  const update = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.min(popupWidth, window.innerWidth - MARGIN * 2);
    let left = rect.left;
    if (left + width > window.innerWidth - MARGIN) {
      left = window.innerWidth - MARGIN - width;
    }
    if (left < MARGIN) left = MARGIN;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropUp = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
    const maxHeight = Math.max(
      160,
      (dropUp ? spaceAbove : spaceBelow) - MARGIN * 2
    );

    setPosition({
      left,
      width,
      maxHeight,
      ...(dropUp
        ? { bottom: window.innerHeight - rect.top + MARGIN }
        : { top: rect.bottom + MARGIN }),
    });
  }, [anchorRef, estimatedHeight, popupWidth]);

  return { position, update, setPosition };
}
