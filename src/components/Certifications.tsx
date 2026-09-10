"use client";

import { motion } from "framer-motion";
import {
  BadgeCheck,
  Award,
  Filter,
  Microscope,
  ShieldCheck,
} from "lucide-react";
import FadeIn from "./FadeIn";

const certifications = [
  {
    icon: BadgeCheck,
    title: "PSQCA Approved Source",
    desc: "Registered and compliant with the Pakistan Standards & Quality Control Authority.",
    tag: "GOVT. APPROVED",
  },
  {
    icon: Award,
    title: "ISO 9001 Certified Quality",
    desc: "International-standard manufacturing, packaging and quality management systems.",
    tag: "ISO 9001",
  },
  {
    icon: Filter,
    title: "Multi-Stage Reverse Osmosis",
    desc: "Advanced 7-stage RO purification with mineralization for balanced taste.",
    tag: "7-STAGE RO",
  },
  {
    icon: Microscope,
    title: "Daily Quality & Mineral Analysis",
    desc: "Every production batch is lab-verified for purity, minerals and safety.",
    tag: "DAILY VERIFIED",
  },
];

const badges = ["Verified", "100% Purity", "Quality Assured"];

export default function Certifications() {
  return (
    <section
      id="certifications"
      className="relative min-h-screen overflow-hidden bg-white px-5 pt-14 pb-24 lg:px-8 dark:bg-[#0F172A]"
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 60% 45% at 80% 25%, rgba(47,185,191,0.08), transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl">
        <FadeIn>
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#2FB9BF]">
              Certifications
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#0F172A] sm:text-4xl lg:text-5xl dark:text-white">
              Quality You Can{" "}
              <span className="text-[#2FB9BF]">Trust</span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-[#475569] dark:text-[#94A3B8]">
              Every drop of Purely water is produced, tested and certified
              against the highest quality standards.
            </p>
          </div>
        </FadeIn>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {certifications.map((cert, i) => (
            <motion.article
              key={cert.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * 0.1 }}
              className="group relative flex flex-col rounded-3xl border border-[#E2E8F0] bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:border-[#2FB9BF] hover:shadow-[0_20px_48px_rgba(47,185,191,0.18)] dark:border-[#1E293B] dark:bg-[#0F172A]"
              style={{ willChange: "transform" }}
            >
              <div className="flex items-start justify-between">
                <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2FB9BF]/10 ring-1 ring-[#2FB9BF]/30 transition-all duration-300 group-hover:shadow-[0_0_24px_rgba(47,185,191,0.4)]">
                  <cert.icon className="h-7 w-7 text-[#2FB9BF]" />
                </span>
                <span className="rounded-full border border-[#2FB9BF]/30 bg-[#2FB9BF]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[#2FB9BF]">
                  {cert.tag}
                </span>
              </div>

              <h3 className="mt-6 text-lg font-bold text-[#0F172A] dark:text-white">
                {cert.title}
              </h3>
              <p className="mt-2.5 flex-1 text-sm leading-relaxed text-[#475569] dark:text-[#94A3B8]">
                {cert.desc}
              </p>

              <div className="mt-6 flex items-center gap-2 border-t border-[#E2E8F0] pt-5 dark:border-[#1E293B]">
                <ShieldCheck className="h-4 w-4 text-[#2FB9BF]" />
                <span className="text-xs font-semibold uppercase tracking-wide text-[#2FB9BF]">
                  {badges[i % badges.length]}
                </span>
              </div>
            </motion.article>
          ))}
        </div>

        <FadeIn delay={0.15}>
          <div className="mt-14 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm text-[#475569] dark:text-[#94A3B8]">
            <span className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-[#2FB9BF]" />
              Regulatory compliant production
            </span>
            <span className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-[#2FB9BF]" />
              Food-safe PET & glass bottles
            </span>
            <span className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-[#2FB9BF]" />
              Batch traceability records
            </span>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}