"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Reveal from "./Reveal";

export default function CTASection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const glowX = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);

  return (
    <section ref={ref} className="relative mx-auto max-w-6xl px-6 py-32">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface/60 px-8 py-20 text-center backdrop-blur">
          <motion.div
            style={{ x: glowX }}
            className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/25 blur-[130px]"
          />
          <div className="relative">
            <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Give your team remote access
              <br />
              <span className="text-gradient">you can actually audit.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-muted">
              Beam deploys on your infrastructure — signaling server, control plane, and
              storage all in your control. No account is provisioned until your team is ready.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="mailto:sales@beam.dev?subject=Beam%20Enterprise%20-%20Request%20Access"
                className="inline-flex items-center gap-2 rounded-full bg-foreground px-8 py-3.5 text-sm font-semibold text-background transition-transform hover:scale-105"
              >
                Request Access
              </a>
              <a
                href="mailto:sales@beam.dev?subject=Beam%20-%20Book%20a%20Demo"
                className="inline-flex items-center gap-2 rounded-full border border-border px-8 py-3.5 text-sm font-medium text-foreground/90 transition-colors hover:bg-surface"
              >
                Book a Demo
              </a>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
