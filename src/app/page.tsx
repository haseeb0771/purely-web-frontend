import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";

const About = dynamic(() => import("@/components/About"), {
  loading: () => <SectionSkeleton />,
});
const CustomServices = dynamic(() => import("@/components/CustomServices"), {
  loading: () => <SectionSkeleton />,
});
const Certifications = dynamic(() => import("@/components/Certifications"), {
  loading: () => <SectionSkeleton />,
});
const Contact = dynamic(() => import("@/components/Contact"), {
  loading: () => <SectionSkeleton />,
});
const Footer = dynamic(() => import("@/components/Footer"));

function SectionSkeleton() {
  return (
    <div className="flex min-h-[420px] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2FB9BF]/30 border-t-[#2FB9BF]" />
    </div>
  );
}

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <About />
        <Certifications />
        <CustomServices />
        <Contact />
      </main>
      <Footer />
    </>
  );
}