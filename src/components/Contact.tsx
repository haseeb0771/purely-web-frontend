"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Phone,
  Mail,
  QrCode,
  Send,
  CheckCircle2,
  MapPin,
} from "lucide-react";
import { InstagramIcon, TikTokIcon, WhatsAppIcon } from "./SocialIcons";
import FadeIn from "./FadeIn";

const inputClass =
  "w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] placeholder-[#94A3B8] outline-none transition-colors duration-300 focus:border-[#2FB9BF] focus:bg-white focus:ring-2 focus:ring-[#2FB9BF]/20 dark:border-[#334155] dark:bg-[#0B131B] dark:text-white dark:placeholder-[#64748B] dark:focus:border-[#2FB9BF] dark:focus:bg-[#0F172A]";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, message }),
      });

      const data = (await res.json()) as {
        success: boolean;
        message?: string;
      };

      if (!res.ok || !data.success) {
        setStatus({
          type: "error",
          text: data.message || "Failed to send email. Please try again.",
        });
        return;
      }

      setStatus({
        type: "success",
        text: data.message || "Your message was sent successfully!",
      });
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch (error) {
      console.error("[contact] Request failed:", error);
      setStatus({
        type: "error",
        text: "Failed to send email. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id="contact"
      className="relative min-h-screen overflow-hidden bg-white px-5 pt-14 pb-24 lg:px-8 dark:bg-[#0F172A]"
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 110%, rgba(47,185,191,0.08), transparent 65%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl">
        <FadeIn>
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#2FB9BF]">
              Contact Us
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#0F172A] sm:text-4xl lg:text-5xl dark:text-white">
              Let&apos;s Bottle Your{" "}
              <span className="text-[#2FB9BF]">Next Idea.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-[#475569] dark:text-[#94A3B8]">
              Quick inquiries, corporate orders or custom design questions —
              reach out and we&apos;ll respond fast.
            </p>
          </div>
        </FadeIn>

        <div className="mt-16 grid gap-8 lg:grid-cols-5">
          <FadeIn className="lg:col-span-3">
            <form
              onSubmit={onSubmit}
              className="rounded-3xl border border-[#E2E8F0] bg-[#F8FAFC] p-8 sm:p-10 dark:border-[#1E293B] dark:bg-[#0B131B]"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-medium text-[#0F172A] dark:text-white"
                  >
                    Full Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor="phone"
                    className="mb-2 block text-sm font-medium text-[#0F172A] dark:text-white"
                  >
                    Phone
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+92 ..."
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="mt-5">
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-[#0F172A] dark:text-white"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className={inputClass}
                />
              </div>

              <div className="mt-5">
                <label
                  htmlFor="message"
                  className="mb-2 block text-sm font-medium text-[#0F172A] dark:text-white"
                >
                  Message / Order Details
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us about your event, brand or quantity..."
                  className={`${inputClass} resize-none`}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="group mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2FB9BF] px-7 py-4 font-semibold text-white shadow-[0_10px_28px_rgba(47,185,191,0.35)] transition-all duration-300 hover:bg-[#28a9af] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[#2FB9BF] sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Send Inquiry
                    <Send className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-0.5" />
                  </>
                )}
              </button>

              {status && (
                <div
                  role="status"
                  className={`mt-5 rounded-2xl border px-5 py-4 text-sm font-medium ${
                    status.type === "success"
                      ? "border-[#2FB9BF]/50 bg-[#2FB9BF]/10 text-[#00324A] dark:text-emerald-300"
                      : "border-red-300 bg-red-50 text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-400"
                  }`}
                >
                  {status.type === "success" ? (
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" />
                      {status.text}
                    </span>
                  ) : (
                    status.text
                  )}
                </div>
              )}
            </form>
          </FadeIn>

          <FadeIn delay={0.12} className="lg:col-span-2">
            <div className="flex h-full flex-col gap-6">
              <div className="flex-1 space-y-4 rounded-3xl border border-[#E2E8F0] bg-[#F8FAFC] p-7 dark:border-[#1E293B] dark:bg-[#0B131B]">
                <a
                  href="tel:+923001076608"
                  className="group flex items-center gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-4 transition-all duration-300 hover:border-[#2FB9BF]/60 hover:shadow-[0_8px_24px_rgba(47,185,191,0.14)] dark:border-[#334155] dark:bg-[#0F172A]"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2FB9BF]/10 ring-1 ring-[#2FB9BF]/30">
                    <Phone className="h-5 w-5 text-[#2FB9BF]" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-[#475569] dark:text-[#94A3B8]">
                      Call us
                    </p>
                    <p className="font-semibold text-[#0F172A] group-hover:text-[#2FB9BF] dark:text-white">
                      +92 300 107 6608
                    </p>
                  </div>
                </a>

                <a
                  href="https://wa.me/923001076608"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-4 transition-all duration-300 hover:border-[#2FB9BF]/60 hover:shadow-[0_8px_24px_rgba(47,185,191,0.14)] dark:border-[#334155] dark:bg-[#0F172A]"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2FB9BF]/10 ring-1 ring-[#2FB9BF]/30">
                    <WhatsAppIcon className="h-5 w-5 text-[#2FB9BF]" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-[#475569] dark:text-[#94A3B8]">
                      WhatsApp
                    </p>
                    <p className="font-semibold text-[#0F172A] group-hover:text-[#2FB9BF] dark:text-white">
                      +92 300 107 6608
                    </p>
                  </div>
                </a>

                <a
                  href="mailto:purelycustomlabels@gmail.com"
                  className="group flex items-center gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-4 transition-all duration-300 hover:border-[#2FB9BF]/60 hover:shadow-[0_8px_24px_rgba(47,185,191,0.14)] dark:border-[#334155] dark:bg-[#0F172A]"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2FB9BF]/10 ring-1 ring-[#2FB9BF]/30">
                    <Mail className="h-5 w-5 text-[#2FB9BF]" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-[#475569] dark:text-[#94A3B8]">
                      Email us
                    </p>
                    <p className="break-all font-semibold text-[#0F172A] group-hover:text-[#2FB9BF] dark:text-white">
                      purelycustomlabels@gmail.com
                    </p>
                  </div>
                </a>

                <div className="flex items-center gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-4 dark:border-[#334155] dark:bg-[#0F172A]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2FB9BF]/10 ring-1 ring-[#2FB9BF]/30">
                    <MapPin className="h-5 w-5 text-[#2FB9BF]" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-[#475569] dark:text-[#94A3B8]">
                      Serving nationwide
                    </p>
                    <p className="font-semibold text-[#0F172A] dark:text-white">
                      Pakistan-wide delivery
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:pt-2">
                  <a
                    href="https://www.instagram.com/purelycustomlabels/#"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full flex-1 items-center justify-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] transition-all duration-300 hover:border-[#2FB9BF] hover:text-[#2FB9BF] hover:shadow-[0_8px_24px_rgba(47,185,191,0.14)] sm:w-auto dark:border-[#334155] dark:bg-[#0F172A] dark:text-white dark:hover:border-[#2FB9BF] dark:hover:text-[#2FB9BF]"
                  >
                    <InstagramIcon className="h-4 w-4" />
                    @purelycustomlabels
                  </a>
                  <a
                    href="https://www.tiktok.com/@purelycustomlabels?is_from_webapp=1&sender_device=pc"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full flex-1 items-center justify-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] transition-all duration-300 hover:border-[#2FB9BF] hover:text-[#2FB9BF] hover:shadow-[0_8px_24px_rgba(47,185,191,0.14)] sm:w-auto dark:border-[#334155] dark:bg-[#0F172A] dark:text-white dark:hover:border-[#2FB9BF] dark:hover:text-[#2FB9BF]"
                  >
                    <TikTokIcon className="h-4 w-4" />
                    @purelycustomlabels
                  </a>
                </div>
              </div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-5 rounded-3xl border border-[#2FB9BF]/40 bg-white p-6 shadow-[0_12px_36px_rgba(47,185,191,0.14)] dark:border-[#2FB9BF]/40 dark:bg-[#0F172A]"
              >
                <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-[#0F172A]/90 bg-white p-3 dark:border-white/80">
                  <QrCode className="h-10 w-10 text-[#0F172A] dark:text-[#0F172A]" />
                  <span className="text-center text-[7px] font-bold uppercase tracking-wide text-[#0F172A]">
                    Scan Me
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-[#0F172A] dark:text-white">
                    Scan to connect
                  </p>
                  <p className="mt-1 text-sm text-[#475569] dark:text-[#94A3B8]">
                    Point your camera to instantly reach Purely — WhatsApp,
                    Instagram or our contact line.
                  </p>
                </div>
              </motion.div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}