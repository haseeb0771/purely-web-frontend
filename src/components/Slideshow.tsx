import Image from "next/image";

const slides = Array.from({ length: 10 }, (_, i) => ({
  src: `/${i + 1}.jpeg`,
  alt: `Purely custom bottle design ${i + 1}`,
}));

function Frame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl ring-1 ring-[#E2E8F0] dark:ring-[#334155]">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(min-width: 1024px) 180px, (min-width: 640px) 200px, 150px"
        quality={90}
        loading="eager"
        className="object-cover"
      />
    </div>
  );
}

export default function Slideshow() {
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-[#E2E8F0]/70 bg-white/60 p-3 shadow-[0_20px_52px_rgba(15,23,42,0.08)] backdrop-blur-md sm:p-4 dark:border-[#1E293B]/80 dark:bg-[#0F172A]/70"
      aria-label="Purely bottle design showcase"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {slides.map((s) => (
          <Frame key={s.src} src={s.src} alt={s.alt} />
        ))}
      </div>
    </div>
  );
}