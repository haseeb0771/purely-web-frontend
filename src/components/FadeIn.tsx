"use client";

import { motion } from "framer-motion";

type FadeInProps = {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  direction?: "up" | "down" | "left" | "right" | "none";
};

export default function FadeIn({
  children,
  delay = 0,
  className,
  direction = "up",
}: FadeInProps) {
  const offset = 28;
  const hidden =
    direction === "none"
      ? { opacity: 0 }
      : {
          opacity: 0,
          x: direction === "left" ? -offset : direction === "right" ? offset : 0,
          y: direction === "up" ? offset : direction === "down" ? -offset : 0,
        };

  return (
    <motion.div
      className={className}
      initial={hidden}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{ willChange: "transform, opacity" }}
    >
      {children}
    </motion.div>
  );
}