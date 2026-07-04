"use client";

import { motion } from "framer-motion";
import Reveal from "./Reveal";

const CHECKLIST = [
  "Org-scoped JWT auth with role-based access (owner / admin / member)",
  "Append-only audit log — logins, connect requests, accepts, rejects, transfers",
  "Session recordings uploaded to your own S3-compatible bucket",
  "Signaling server never touches media, passwords, or recordings",
  "Refresh tokens are revocable server-side, not just short-lived",
];

const LOG_ROWS = [
  { time: "14:02:11", type: "auth.login", detail: "owner@yourco.com" },
  { time: "14:03:44", type: "device.registered", detail: "551158948" },
  { time: "14:06:02", type: "session.accepted", detail: "→ 902441117" },
  { time: "14:19:37", type: "file_transfer.sent", detail: "deploy-notes.pdf" },
  { time: "14:31:05", type: "session.ended", detail: "user_disconnected" },
];

export default function Enterprise() {
  return (
    <section id="enterprise" className="relative mx-auto max-w-6xl px-6 py-32">
      <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
        <Reveal>
          <span className="text-xs font-semibold uppercase tracking-widest text-accent-2">
            Enterprise-ready
          </span>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            The controls your
            <br />
            <span className="text-gradient">security review asks for.</span>
          </h2>
          <p className="mt-5 max-w-md text-muted">
            Beam was built backwards from what an IT admin needs to approve a remote
            access tool — not bolted on after the fact.
          </p>

          <ul className="mt-8 flex flex-col gap-4">
            {CHECKLIST.map((item, i) => (
              <Reveal key={item} delay={i * 0.05}>
                <li className="flex items-start gap-3 text-sm text-foreground/90">
                  <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[10px] text-accent-2">
                    ✓
                  </span>
                  {item}
                </li>
              </Reveal>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.1}>
          <motion.div
            initial={{ rotateX: 8, rotateY: -10 }}
            whileInView={{ rotateX: 0, rotateY: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformPerspective: 1200 }}
            className="rounded-2xl border border-border bg-surface/70 p-6 shadow-[0_40px_120px_-30px_rgba(99,102,241,0.35)] backdrop-blur"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-medium text-muted">Audit log</span>
              <span className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <span className="h-2.5 w-2.5 rounded-full bg-accent-2/60" />
              </span>
            </div>
            <div className="flex flex-col gap-2.5 font-mono text-[13px]">
              {LOG_ROWS.map((row, i) => (
                <Reveal key={row.time} delay={0.15 + i * 0.08} y={12}>
                  <div className="flex items-center gap-3 rounded-lg bg-surface-2/70 px-3 py-2">
                    <span className="text-muted">{row.time}</span>
                    <span className="text-accent-2">{row.type}</span>
                    <span className="ml-auto truncate text-foreground/70">{row.detail}</span>
                  </div>
                </Reveal>
              ))}
            </div>
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}
