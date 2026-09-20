"use client";

import { useEffect, useState } from "react";

export default function NumberInput({
  value,
  onValueChange,
  placeholder,
  min = 0,
  max = Infinity,
  className,
  allowDecimal = false,
}: {
  value: number;
  onValueChange: (value: number) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  className?: string;
  allowDecimal?: boolean;
}) {
  const [text, setText] = useState<string>(value === 0 ? "" : String(value));

  useEffect(() => {
    setText(value === 0 ? "" : String(value));
  }, [value]);

  return (
    <input
      type="text"
      inputMode={allowDecimal ? "decimal" : "numeric"}
      value={text}
      placeholder={placeholder}
      onChange={(e) => {
        const raw = e.target.value;
        const pattern = allowDecimal ? /^\d*\.?\d*$/ : /^\d*$/;
        if (!pattern.test(raw)) return;
        setText(raw);
        let parsed = raw === "" || raw === "." ? 0 : Number(raw);
        parsed = Number.isFinite(parsed) ? parsed : 0;
        const safe = Math.min(Math.max(parsed, min), max);
        if (parsed !== safe) {
          setText(safe === 0 ? "" : String(safe));
        }
        if (safe !== value) onValueChange(safe);
      }}
      onBlur={() => setText(value === 0 ? "" : String(value))}
      className={className}
    />
  );
}
