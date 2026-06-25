import type { NextConfig } from "next";

const SYNTHETIC = ["../../data/synthetic/*.json"];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The portal renders per-customer views and reorders from the committed
  // synthetic dataset. Force-include it so server routes can read it on Vercel.
  outputFileTracingIncludes: {
    "/": SYNTHETIC,
    "/fleet": SYNTHETIC,
    "/inventory": SYNTHETIC,
    "/orders": SYNTHETIC,
    "/orders/[id]": SYNTHETIC,
    "/login": SYNTHETIC,
    "/api/reorder": SYNTHETIC,
    "/api/session": SYNTHETIC,
  },
};

export default nextConfig;
