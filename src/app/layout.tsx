import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Purely Custom Labels",
  description:
    "Delivering crystal-clear lab-tested RO-filtered mineral water and personalized custom bottle designs tailored for your business, events, or home.",
  keywords: [
    "mineral water",
    "RO filtered water",
    "custom bottled water",
    "white label water",
    "event water bottles",
    "Purely",
  ],
  icons: {
    icon: "/favi.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark")document.documentElement.classList.add("dark")}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-white text-[#0F172A] dark:bg-[#0B131B] dark:text-[#E2E8F0]">
        {children}
      </body>
    </html>
  );
}