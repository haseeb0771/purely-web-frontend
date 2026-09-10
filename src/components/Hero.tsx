"use client";

import { motion } from "framer-motion";
import {
  ShieldCheck,
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  Users,
  Droplets,
  Package,
  Headset,
} from "lucide-react";

const scrollTo = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
  e.preventDefault();
  document
    .querySelector(href)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
};

const stats = [
  { icon: Users, value: "1,200+", label: "Happy Clients" },
  { icon: Droplets, value: "10M+", label: "Bottles Delivered" },
  { icon: Package, value: "4", label: "Custom Sizes" },
  { icon: Headset, value: "24/7", label: "Support & Supply" },
];

const trustPoints = [
  "Multi-Stage RO Purified",
  "Daily Lab Tested",
  "White-Label Ready",
];

export default function Hero() {
  return (
    <section
      id="home"
      className="bg-grid relative flex min-h-screen supports-[height:100svh]:min-h-svh overflow-hidden bg-white dark:bg-[#0F172A]"
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 65% 50% at 50% 18%, rgba(47,185,191,0.14), transparent 62%)",
        }}
      />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center px-5 pb-20 pt-28 sm:px-6 sm:pb-24 sm:pt-32 lg:pt-28">
        <div className="flex w-full flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-16">
          <div className="flex-1 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="inline-flex items-center gap-2 rounded-full border border-[#2FB9BF]/20 bg-[#2FB9BF]/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#2FB9BF]"
            >
              <Droplets className="h-3.5 w-3.5" />
              Premium Water Solutions
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 text-3xl font-extrabold leading-tight tracking-tight text-[#0F172A] sm:text-4xl md:text-5xl lg:text-[3.25rem] dark:text-white"
            >
              Elevate Your Brand with{" "}
              <span className="text-[#2FB9BF]">Custom Labeled</span> Drinking
              Water
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-5 max-w-xl text-lg leading-relaxed text-[#475569] sm:mt-6 dark:text-[#94A3B8] lg:mx-0 mx-auto"
            >
              Delivering crystal-clear mineral water under our Purely label,
              alongside customized white-label water bottles designed for your
              corporate events and business branding.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-8 flex w-full flex-col items-center justify-center gap-4 sm:w-auto sm:flex-row lg:justify-start"
            >
              <a
                href="#certifications"
                onClick={(e) => scrollTo(e, "#certifications")}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2FB9BF] px-7 py-4 font-semibold text-white shadow-[0_12px_32px_rgba(47,185,191,0.4)] transition-all duration-300 hover:bg-[#28a9af] hover:shadow-[0_12px_44px_rgba(47,185,191,0.55)] sm:w-auto"
              >
                <ShieldCheck className="h-5 w-5" />
                Explore Certifications
                <ArrowDown className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5" />
              </a>
              <a
                href="#contact"
                onClick={(e) => scrollTo(e, "#contact")}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#E2E8F0] bg-white/70 px-7 py-4 font-semibold text-[#0F172A] transition-all duration-300 hover:border-[#2FB9BF] hover:text-[#2FB9BF] hover:shadow-[0_8px_28px_rgba(47,185,191,0.18)] sm:w-auto dark:border-[#334155] dark:bg-[#0B131B]/70 dark:text-white dark:hover:border-[#2FB9BF] dark:hover:text-[#2FB9BF]"
              >
                Get Custom Quotes
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.6 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-[#475569] sm:mt-10 lg:justify-start dark:text-[#94A3B8]"
            >
              {trustPoints.map((point) => (
                <span key={point} className="flex items-center gap-2">
                  <BadgeCheck className="h-5 w-5 text-[#2FB9BF]" />
                  {point}
                </span>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 30, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="relative flex-1 flex justify-center lg:justify-end"
          >
            <div className="relative w-full max-w-md lg:max-w-lg">
              <div className="absolute -inset-6 rounded-3xl bg-[#2FB9BF]/5 blur-3xl" />
              <div className="relative overflow-hidden rounded-3xl border border-[#E2E8F0] bg-white shadow-[0_24px_64px_rgba(15,23,42,0.12)] dark:border-[#1E293B] dark:bg-[#0F172A] dark:shadow-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/purely-hero-image.jfif"
                  alt="Purely custom labeled water bottles"
                  className="h-auto w-full object-cover"
                />
              </div>
              <div className="absolute -bottom-4 -right-4 rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 shadow-lg dark:border-[#1E293B] dark:bg-[#0F172A]">
                <p className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">
                  Trusted Since
                </p>
                <p className="text-lg font-extrabold text-[#2FB9BF]">
                  2020
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="mt-12 grid w-full max-w-4xl grid-cols-2 gap-4 sm:mt-16 sm:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.7 + i * 0.1 }}
              className="glass flex flex-col items-center gap-2 rounded-2xl px-4 py-5"
            >
              <stat.icon className="h-6 w-6 text-[#2FB9BF]" />
              <p className="text-2xl font-extrabold tracking-tight text-[#0F172A] sm:text-3xl dark:text-white">
                {stat.value}
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#475569] dark:text-[#94A3B8]">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.a
        href="#about"
        onClick={(e) => scrollTo(e, "#about")}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.8 }}
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 rounded-full bg-white/70 p-2 text-[#475569] shadow-sm ring-1 ring-[#E2E8F0] backdrop-blur-md transition-colors hover:text-[#2FB9BF] md:block dark:bg-[#0F172A]/70 dark:text-[#94A3B8] dark:ring-[#334155] dark:hover:text-[#2FB9BF]"
        aria-label="Scroll to about"
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        >
          <ArrowDown className="h-5 w-5" />
        </motion.div>
      </motion.a>
    </section>
  );
}
