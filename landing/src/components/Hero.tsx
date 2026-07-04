"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import dynamic from "next/dynamic";

const Scene3D = dynamic(() => import("./Scene3D"), { ssr: false });

const easeOut = [0.16, 1, 0.3, 1] as const;

export default function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const sceneY = useTransform(scrollYProgress, [0, 1], ["0%", "35%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "60%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const glowY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  return (
    <section id="top" ref={ref} className="relative min-h-screen overflow-hidden pt-32">
      {/* Parallax background glow */}
      <motion.div
        style={{ y: glowY }}
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute left-1/2 top-[-10%] h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-accent/25 blur-[140px]" />
        <div className="absolute right-[10%] top-[20%] h-[360px] w-[360px] rounded-full bg-accent-2/20 blur-[120px]" />
        <div className="absolute left-[8%] top-[40%] h-[320px] w-[320px] rounded-full bg-accent-3/20 blur-[120px]" />
      </motion.div>

      {/* 3D centerpiece */}
      <motion.div
        style={{ y: sceneY }}
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[720px] opacity-90"
      >
        <Scene3D />
      </motion.div>

      <motion.div style={{ y: textY, opacity }} className="relative mx-auto max-w-5xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeOut }}
          className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-1.5 text-xs text-muted backdrop-blur"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent-2 shadow-[0_0_8px_2px_var(--accent-2)]" />
          Self-hosted. Enterprise-audited. Zero third-party relay.
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05, ease: easeOut }}
          className="text-balance text-5xl font-semibold tracking-tight sm:text-6xl md:text-7xl"
        >
          Remote access,
          <br />
          <span className="text-gradient">fully under your control.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: easeOut }}
          className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted"
        >
          Beam is the remote desktop platform built for teams that can&apos;t hand their
          screens to someone else&apos;s cloud. Peer-to-peer control, org-wide audit
          logs, and recorded sessions — hosted entirely on your infrastructure.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: easeOut }}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <a
            href="mailto:sales@beam.dev?subject=Beam%20Enterprise%20-%20Request%20Access"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-foreground px-7 py-3.5 text-sm font-semibold text-background transition-transform hover:scale-105"
          >
            Request Access
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </a>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-full border border-border px-7 py-3.5 text-sm font-medium text-foreground/90 backdrop-blur transition-colors hover:bg-surface"
          >
            See how it works
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
}
