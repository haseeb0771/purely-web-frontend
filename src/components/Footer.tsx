"use client";

import { InstagramIcon, TikTokIcon } from "./SocialIcons";
import BrandLogo from "./BrandLogo";

const links: { label: string; href: string }[] = [
  { label: "Home", href: "#home" },
  { label: "About Us", href: "#about" },
  { label: "Certifications", href: "#certifications" },
  { label: "Custom Services", href: "#custom-services" },
  { label: "Contact Us", href: "#contact" },
];

const scrollTo = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
  e.preventDefault();
  document
    .querySelector(href)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
};

export default function Footer() {
  return (
    <footer className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-5 py-14 lg:px-8 dark:border-[#1E293B] dark:bg-[#0B131B]">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-8 md:flex-row md:justify-between">
        <a
          href="#home"
          onClick={(e) => scrollTo(e, "#home")}
          className="flex items-center"
        >
          <BrandLogo className="h-9 w-auto" />
        </a>

        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={(e) => scrollTo(e, link.href)}
                className="text-sm font-medium text-[#475569] transition-colors hover:text-[#2FB9BF] dark:text-[#94A3B8] dark:hover:text-[#2FB9BF]"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <a
            href="https://www.instagram.com/purelycustomlabels/#"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#475569] transition-all duration-300 hover:border-[#2FB9BF] hover:text-[#2FB9BF] hover:shadow-[0_8px_20px_rgba(47,185,191,0.2)] dark:border-[#334155] dark:bg-[#0F172A] dark:text-[#94A3B8] dark:hover:border-[#2FB9BF] dark:hover:text-[#2FB9BF]"
          >
            <InstagramIcon className="h-4 w-4" />
          </a>
          <a
            href="https://www.tiktok.com/@purelycustomlabels?is_from_webapp=1&sender_device=pc"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="TikTok"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#475569] transition-all duration-300 hover:border-[#2FB9BF] hover:text-[#2FB9BF] hover:shadow-[0_8px_20px_rgba(47,185,191,0.2)] dark:border-[#334155] dark:bg-[#0F172A] dark:text-[#94A3B8] dark:hover:border-[#2FB9BF] dark:hover:text-[#2FB9BF]"
          >
            <TikTokIcon className="h-4 w-4" />
          </a>
        </div>
      </div>

      <div className="mx-auto mt-10 flex max-w-7xl flex-col items-center justify-between gap-3 border-t border-[#E2E8F0] pt-8 text-xs text-[#94A3B8] md:flex-row dark:border-[#1E293B] dark:text-[#64748B]">
        <p>
          © {new Date().getFullYear()} Purely. Pure mineral water & custom
          labeled packaging.
        </p>
        <p>100% Lab-Tested · RO Filtered · Your Brand, Bottled.</p>
      </div>
    </footer>
  );
}