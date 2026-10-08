import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const nextConfig: NextConfig = {
  output: "export",
  agentRules: false,
  transpilePackages: ["@a2f0/shared", "@a2f0/website"],
  webpack: (config) => {
    // `?raw` imports a file's text, such as the website's index.html.
    config.module.rules.push({ resourceQuery: /raw/, type: "asset/source" });
    return config;
  },
};

// The routed shell's routes (/app/<app id>) load the one page: the Worker
// falls back to it in production (see wrangler.jsonc), and the dev server
// rewrites them to it. The static export takes no rewrites.
export default function config(phase: string): NextConfig {
  if (phase !== PHASE_DEVELOPMENT_SERVER) return nextConfig;
  return {
    ...nextConfig,
    rewrites: async () => [{ source: "/app/:path*", destination: "/" }],
  };
}
