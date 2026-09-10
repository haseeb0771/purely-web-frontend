"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";

const PREVIEW_SIZE = 160;

export default function ImageHoverPreview({
  src,
  alt,
  children,
  previewSize = PREVIEW_SIZE,
  className,
}: {
  src: string;
  alt: string;
  children: ReactNode;
  previewSize?: number;
  className?: string;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [show, setShow] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setPos({ x: e.clientX, y: e.clientY });
  }, []);

  const [ready, setReady] = useState(false);

  let left = (pos?.x ?? 0) + 16;
  let top = (pos?.y ?? 0) + 16;

  if (pos && previewRef.current) {
    const rect = previewRef.current.getBoundingClientRect();
    if (left + rect.width > window.innerWidth - 12) {
      left = (pos?.x ?? 0) - rect.width - 16;
    }
    if (top + rect.height > window.innerHeight - 12) {
      top = (pos?.y ?? 0) - rect.height - 16;
    }
  }

  return (
    <>
      <div className={className} onMouseMove={onMouseMove} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
        {children}
      </div>
      {show && (
        <div
          ref={previewRef}
          className="pointer-events-none fixed z-[60] overflow-hidden rounded-xl border border-[#E2E8F0] bg-white p-1 shadow-[0_16px_48px_rgba(15,23,42,0.2)] dark:border-[#1E293B] dark:bg-[#0F172A]"
          style={{ left, top, width: previewSize, height: previewSize }}
        >
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-[#94A3B8]">
              Loading…
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="h-full w-full rounded-lg object-contain"
            onLoad={() => setReady(true)}
          />
        </div>
      )}
    </>
  );
}