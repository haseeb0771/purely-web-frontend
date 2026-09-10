"use client";

import { motion } from "framer-motion";
import {
  Building2,
  Heart,
  Hotel,
  Store,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import FadeIn from "./FadeIn";

const clients = [
  { icon: Building2, label: "Corporate Events" },
  { icon: Heart, label: "Weddings" },
  { icon: Hotel, label: "Hotels & Hospitality" },
  { icon: Store, label: "Retail Brands" },
];

const sizes = [
  { size: "300ml", use: "Events, meetings & giveaways" },
  { size: "500ml", use: "Restaurants, gyms & on-the-go" },
  { size: "1.5L", use: "Tables, homes & retail shelves" },
  { size: "19L", use: "Gallons for offices & bulk supply" },
];

export default function CustomServices() {
  return (
    <section
      id="custom-services"
      className="relative min-h-screen overflow-hidden bg-[#F8FAFC] px-5 pt-14 pb-24 lg:px-8 dark:bg-[#0B131B]"
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 20% 20%, rgba(47,185,191,0.08), transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl">
        <FadeIn>
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#2FB9BF]">
              Custom Services
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#0F172A] sm:text-4xl lg:text-5xl dark:text-white">
              Your Brand,{" "}
              <span className="text-[#2FB9BF]">Bottled Beautifully.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-[#475569] dark:text-[#94A3B8]">
              From single events to full retail lines — we design, print and
              deliver custom-labeled water in every size you need.
            </p>
          </div>
        </FadeIn>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {clients.map((client, i) => (
            <motion.div
              key={client.label}
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group flex flex-col items-center gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-7 text-center transition-all duration-300 hover:-translate-y-1 hover:border-[#2FB9BF] hover:shadow-[0_12px_36px_rgba(47,185,191,0.14)] dark:border-[#1E293B] dark:bg-[#0F172A]"
              style={{ willChange: "transform" }}
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2FB9BF]/10 ring-1 ring-[#2FB9BF]/30 transition-all duration-300 group-hover:bg-[#2FB9BF]/15 group-hover:ring-[#2FB9BF]">
                <client.icon className="h-7 w-7 text-[#2FB9BF]" />
              </span>
              <h3 className="font-semibold text-[#0F172A] dark:text-white">{client.label}</h3>
              <p className="text-sm text-[#475569] dark:text-[#94A3B8]">
                Fully branded water that elevates every table, shelf and event.
              </p>
            </motion.div>
          ))}
        </div>

        <FadeIn delay={0.1}>
          <div className="mt-16 overflow-hidden rounded-3xl border border-[#E2E8F0] bg-white dark:border-[#1E293B] dark:bg-[#0F172A]">
            <div className="grid lg:grid-cols-2">
              <div className="p-8 sm:p-12">
                <h3 className="text-2xl font-bold text-[#0F172A] dark:text-white">
                  Available Bottle{" "}
                  <span className="text-[#2FB9BF]">Sizes</span>
                </h3>
                <div className="mt-8 space-y-4">
                  {sizes.map((s, i) => (
                    <motion.div
                      key={s.size}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.45, delay: i * 0.08 }}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4 transition-colors duration-300 hover:border-[#2FB9BF]/60 dark:border-[#1E293B] dark:bg-[#0B131B]"
                    >
                      <div>
                        <p className="font-bold text-[#2FB9BF]">{s.size}</p>
                        <p className="text-sm text-[#475569] dark:text-[#94A3B8]">{s.use}</p>
                      </div>
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-[#2FB9BF]" />
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col justify-center gap-6 border-t border-[#E2E8F0] p-8 sm:p-12 lg:border-l lg:border-t-0 dark:border-[#1E293B]">
                <h3 className="text-2xl font-bold text-[#0F172A] dark:text-white">
                  End-to-End{" "}
                  <span className="text-[#2FB9BF]">Custom Services</span>
                </h3>
                <ul className="space-y-3 text-[#475569] dark:text-[#94A3B8]">
                  {[
                    "High-quality print on high-grade labels",
                    "Full custom artwork & logo design support",
                    "Premium glass & PET bottle options",
                    "Quick-turnaround for weddings & events",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#2FB9BF]" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <motion.a
                  href="#contact"
                  onClick={(e) => {
                    e.preventDefault();
                    document
                      .querySelector("#contact")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  className="group mt-2 inline-flex w-fit items-center gap-2 rounded-full bg-[#2FB9BF] px-7 py-3.5 font-semibold text-white shadow-[0_12px_32px_rgba(47,185,191,0.35)] transition-all duration-300 hover:bg-[#28a9af]"
                >
                  Start Your Custom Order
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </motion.a>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}