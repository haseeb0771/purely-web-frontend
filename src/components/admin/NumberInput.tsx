"use client";

import { useEffect, useState } from "react";

export default function NumberInput({
  value,
  onValueChange,
  placeholder,
  min = 0,
  className,
}: {
  value: number;
  onValueChange: (value: number) => void;
  placeholder?: string;
  min?: number;
  className?: string;
}) {
  const [text, setText] = useState<string>(value === 0 ? "" : String(value));

  useEffect(() => {
    setText(value === 0 ? "" : String(value));
  }, [value]);

  return (
    <input
      type="text"
      inputMode="numeric"
      value={text}
      placeholder={placeholder}
      onChange={(e) => {
        const raw = e.target.value;
        if (!/^\d*$/.test(raw)) return;
        setText(raw);
        const parsed = raw === "" ? 0 : Number(raw);
        const safe = Number.isFinite(parsed) && parsed >= min ? parsed : 0;
        if (safe !== value) onValueChange(safe);
      }}
      onBlur={() => setText(value === 0 ? "" : String(value))}
      className={className}
    />
  );
}
