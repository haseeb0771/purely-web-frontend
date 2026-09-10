import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Portal — Purely",
  description: "Purely admin panel. Authorized access only.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}