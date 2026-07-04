import SmoothScroll from "@/components/SmoothScroll";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import Enterprise from "@/components/Enterprise";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <SmoothScroll>
      <div className="noise-overlay" />
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Enterprise />
        <CTASection />
      </main>
      <Footer />
    </SmoothScroll>
  );
}
