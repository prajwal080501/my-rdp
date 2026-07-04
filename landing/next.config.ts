import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // This app lives in a subdirectory of a multi-project repo that has its
  // own (unrelated, stray) root-level lockfile — pin the workspace root
  // explicitly rather than let Next.js guess from lockfile detection.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
