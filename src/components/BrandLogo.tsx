"use client";

import { useState } from "react";
import Image from "next/image";
import { Droplets } from "lucide-react";

export default function BrandLogo({ className = "h-9 w-auto" }: { className?: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="flex items-center gap-2 font-bold tracking-tight">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2FB9BF]/10 ring-1 ring-[#2FB9BF]/40">
          <Droplets className="h-4 w-4 text-[#2FB9BF]" />
        </span>
        <span className="text-2xl text-[#2FB9BF]">
          Purely<span className="text-[#0F172A] dark:text-white">.</span>
        </span>
      </span>
    );
  }

  return (
    <>
      <Image
        src="/logo.png"
        alt="Purely"
        width={363}
        height={130}
        priority
        quality={90}
        onError={() => setFailed(true)}
        className={`${className} dark:hidden`}
      />
      <Image
        src="/darklogo.png"
        alt="Purely"
        width={533}
        height={196}
        quality={90}
        onError={() => setFailed(true)}
        className={`${className} hidden dark:block`}
      />
    </>
  );
}