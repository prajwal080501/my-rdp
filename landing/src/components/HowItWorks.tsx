"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Reveal from "./Reveal";

const STEPS = [
  {
    number: "01",
    title: "Sign in with your org account",
    body: "An owner or admin creates your account — there's no public signup. Every login is tied to a single organization from the first click.",
  },
  {
    number: "02",
    title: "Register the device",
    body: "Beam binds your device ID to your org and issues a narrow, signaling-only token. It carries no capability beyond registering that one device.",
  },
  {
    number: "03",
    title: "Connect over WebRTC",
    body: "Request a session by ID, the other side accepts, and a direct peer-to-peer connection negotiates screen, input, and file-transfer channels.",
  },
  {
    number: "04",
    title: "Everything gets logged",
    body: "The connection, the accept, the duration, every file sent — recorded to your audit trail, with the session video archived to your own storage.",
  },
];

export default function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.8", "end 0.4"],
  });
  const lineHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section id="how-it-works" className="relative mx-auto max-w-4xl px-6 py-32">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          From login to logged session,
          <br />
          <span className="text-gradient">in four steps.</span>
        </h2>
      </Reveal>

      <div ref={ref} className="relative mt-20">
        <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border sm:left-[23px]" />
        <motion.div
          style={{ height: lineHeight }}
          className="absolute left-[19px] top-2 w-px bg-gradient-to-b from-accent-2 via-accent to-accent-3 sm:left-[23px]"
        />

        <div className="flex flex-col gap-14">
          {STEPS.map((step, i) => (
            <Reveal key={step.number} delay={i * 0.05}>
              <div className="relative flex gap-6 pl-2 sm:gap-8">
                <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-xs font-semibold text-accent-2 sm:h-12 sm:w-12">
                  {step.number}
                </div>
                <div className="pt-1">
                  <h3 className="text-xl font-medium">{step.title}</h3>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{step.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
