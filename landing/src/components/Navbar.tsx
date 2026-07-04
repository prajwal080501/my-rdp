"use client";

import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#enterprise", label: "Enterprise" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 24);
  });

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        scrolled ? "bg-background/70 backdrop-blur-xl border-b border-border" : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#top" className="flex items-center gap-2 font-semibold tracking-tight text-lg">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_16px_2px_var(--accent)]" />
          Beam
        </a>

        <div className="hidden md:flex items-center gap-8 text-sm text-muted">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-foreground transition-colors">
              {link.label}
            </a>
          ))}
        </div>

        <a
          href="mailto:sales@beam.dev?subject=Beam%20Enterprise%20-%20Request%20Access"
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-transform hover:scale-105"
        >
          Request Access
        </a>
      </nav>
    </motion.header>
  );
}
