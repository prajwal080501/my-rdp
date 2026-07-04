"use client";

import { motion } from "framer-motion";
import Reveal from "./Reveal";

const FEATURES = [
  {
    title: "Peer-to-peer by default",
    body: "Screen and input travel over a direct WebRTC connection. The signaling server relays a handshake — never media, never passwords.",
  },
  {
    title: "Org-scoped access",
    body: "Every device is bound to your organization at registration. Connections across orgs are rejected at the signaling layer, not just the UI.",
  },
  {
    title: "Full audit trail",
    body: "Logins, connect requests, accepts, rejects, and file transfers all land in an append-only log your admins can query and filter.",
  },
  {
    title: "Session recording",
    body: "Every controlled session is captured and uploaded to your own S3-compatible storage — reviewable after the fact, not just logged.",
  },
  {
    title: "Role-based control",
    body: "Owners and admins manage teammates and review activity. Members get exactly the access their role grants — nothing implicit.",
  },
  {
    title: "Self-hosted, start to finish",
    body: "Run the signaling server, control plane, and storage on your own infrastructure. No third party ever sits in the data path.",
  },
];

export default function Features() {
  return (
    <section id="features" className="relative mx-auto max-w-6xl px-6 py-32">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Built like infrastructure,
          <br />
          <span className="text-gradient">not a consumer app.</span>
        </h2>
        <p className="mt-5 text-muted">
          Every feature exists because an enterprise security review asked for it.
        </p>
      </Reveal>

      <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature, i) => (
          <Reveal key={feature.title} delay={i * 0.06}>
            <motion.div
              whileHover={{ y: -6, borderColor: "rgba(99,102,241,0.5)" }}
              transition={{ duration: 0.25 }}
              className="group h-full rounded-2xl border border-border bg-surface/60 p-7 backdrop-blur"
            >
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent">
                <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_10px_2px_var(--accent)]" />
              </div>
              <h3 className="text-lg font-medium">{feature.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted">{feature.body}</p>
            </motion.div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
