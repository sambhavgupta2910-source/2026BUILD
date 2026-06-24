import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The intake routes read the committed synthetic parts dataset to resolve
  // us_origin for the export-control rule. Force-include it in the traced
  // output so it ships with the serverless functions on Vercel.
  outputFileTracingIncludes: {
    "/api/rfq": ["../../data/synthetic/parts.json"],
    "/api/aog": ["../../data/synthetic/parts.json"],
  },
};

export default nextConfig;
