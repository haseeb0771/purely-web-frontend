"use client";

import { motion } from "framer-motion";
import {
  Droplets,
  Tag,
  FlaskConical,
  Factory,
  GitBranch,
} from "lucide-react";
import FadeIn from "./FadeIn";

const pillars = [
  {
    icon: Droplets,
    title: "Purely Branded Water",
    points: [
      "100% lab-tested RO-filtered premium mineral water",
      "Consistent crystal-clear purity in every batch",
      "Sold under the trusted Purely brand name",
    ],
  },
  {
    icon: Tag,
    title: "Custom Labeled Packaging",
    points: [
      "White-label bottles with your logo & design",
      "Built for corporates, weddings, events & retail",
      "One partner for water supply + full branding",
    ],
  },
];

const stats = [
  { value: "100%", label: "Lab tested" },
  { value: "4", label: "Bottle sizes" },
  { value: "24/7", label: "Supply support" },
];

export default function About() {
  return (
    <section id="about" className="relative min-h-screen bg-[#F8FAFC] px-5 pt-14 pb-24 lg:px-8 dark:bg-[#0B131B]">
      <div className="mx-auto max-w-7xl">
        <FadeIn>
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#2FB9BF]">
              About Us
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#0F172A] sm:text-4xl lg:text-5xl dark:text-white">
              One Company.{" "}
              <span className="text-[#2FB9BF]">Two Powerful Offerings.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-[#475569] dark:text-[#94A3B8]">
              We deliver premium purified drinking water and turn your bottles
              into branded experiences your customers will remember.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="glow-ring relative mt-14 overflow-hidden rounded-3xl border border-[#E2E8F0] bg-white p-8 sm:p-12 dark:border-[#1E293B] dark:bg-[#0F172A]">
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#2FB9BF]/10 blur-[90px]" />
              <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-[#2FB9BF]/10 blur-[90px]" />
            </div>

            <div className="relative">
              <div className="grid gap-8 lg:grid-cols-2">
                {pillars.map((pillar, i) => (
                  <motion.article
                    key={pillar.title}
                    initial={{ opacity: 0, y: 28 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.6, delay: i * 0.15 }}
                    className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC]/80 p-7 transition-all duration-300 hover:border-[#2FB9BF] hover:shadow-[0_12px_36px_rgba(47,185,191,0.14)] dark:border-[#1E293B] dark:bg-[#0B131B]/80"
                    style={{ willChange: "transform, opacity" }}
                  >
                    <div className="flex items-center gap-4">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2FB9BF]/10 ring-1 ring-[#2FB9BF]/30">
                        <pillar.icon className="h-6 w-6 text-[#2FB9BF]" />
                      </span>
                      <h3 className="text-lg font-semibold text-[#0F172A] dark:text-white">
                        {pillar.title}
                      </h3>
                    </div>
                    <ul className="mt-5 space-y-3 text-[#475569] dark:text-[#94A3B8]">
                      {pillar.points.map((point) => (
                        <li key={point} className="flex gap-3 text-sm">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2FB9BF]" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </motion.article>
                ))}
              </div>

              <div className="mt-12 grid grid-cols-3 gap-4 border-t border-[#E2E8F0] pt-8 text-center lg:mt-16 dark:border-[#1E293B]">
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <p className="text-3xl font-extrabold text-[#2FB9BF] sm:text-4xl">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-widest text-[#475569] sm:text-sm dark:text-[#94A3B8]">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: FlaskConical,
                title: "Lab-Grade Purity",
                text: "Every batch passes daily in-house lab verification before it reaches your bottle.",
              },
              {
                icon: Factory,
                title: "Production & Fill Lines",
                text: "Modern bottling across 300ml, 500ml, 1.5L and 19L gallon formats.",
              },
              {
                icon: GitBranch,
                title: "Logistics & Supply",
                text: "Reliable delivery for homes, offices, restaurants and event venues.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="rounded-2xl border border-[#E2E8F0] bg-white p-6 transition-all duration-300 hover:border-[#2FB9BF] hover:shadow-[0_10px_32px_rgba(47,185,191,0.12)] dark:border-[#1E293B] dark:bg-[#0F172A]"
                style={{ willChange: "transform, opacity" }}
              >
                <item.icon className="h-7 w-7 text-[#2FB9BF]" />
                <h3 className="mt-4 font-semibold text-[#0F172A] dark:text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#475569] dark:text-[#94A3B8]">
                  {item.text}
                </p>
              </motion.div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}