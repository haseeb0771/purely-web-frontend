"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import BrandLogo from "./BrandLogo";
import ThemeToggle from "./ThemeToggle";

const links: { label: string; href: string }[] = [
  { label: "Home", href: "#home" },
  { label: "About Us", href: "#about" },
  { label: "Certifications", href: "#certifications" },
  { label: "Custom Services", href: "#custom-services" },
  { label: "Contact Us", href: "#contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleNav = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setOpen(false);
    document
      .querySelector(href)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-[#E2E8F0] bg-white/80 backdrop-blur-xl shadow-[0_4px_24px_rgba(15,23,42,0.06)] dark:border-[#1E293B] dark:bg-[#0B131B]/85"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:h-20 lg:px-8">
        <a
          href="#home"
          onClick={(e) => handleNav(e, "#home")}
          className="flex shrink-0 items-center"
          aria-label="Purely home"
        >
          <BrandLogo className="h-9 w-auto sm:h-10" />
        </a>

        <ul className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 lg:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={(e) => handleNav(e, link.href)}
                className="group relative rounded-lg px-4 py-2 text-sm font-medium text-[#475569] transition-colors duration-200 hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-white"
              >
                {link.label}
                <span className="absolute inset-x-4 -bottom-px h-0.5 origin-left scale-x-0 rounded-full bg-[#2FB9BF] transition-transform duration-300 group-hover:scale-x-100" />
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#0F172A] ring-1 ring-[#E2E8F0] transition-colors hover:text-[#2FB9BF] lg:hidden dark:text-[#E2E8F0] dark:ring-[#334155] dark:hover:text-[#2FB9BF]"
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-[#E2E8F0] bg-white/95 backdrop-blur-xl lg:hidden dark:border-[#1E293B] dark:bg-[#0F172A]/95"
          >
            <ul className="flex flex-col gap-1 px-5 py-4">
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={(e) => handleNav(e, link.href)}
                    className="block rounded-lg px-3 py-3 text-base font-medium text-[#475569] transition-colors hover:bg-[#2FB9BF]/10 hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-white"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}