import type { NextConfig } from "next";

const SYNTHETIC = ["../../data/synthetic/*.json", "../../data/synthetic/intake/*.json"];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The console reads the synthetic dataset + the runtime intake queue to build
  // the operator view. Force-include them in the traced server output.
  outputFileTracingIncludes: {
    "/": SYNTHETIC,
    "/rfq/[id]": SYNTHETIC,
    "/api/quote/approve": SYNTHETIC,
  },
};

export default nextConfig;
