import type { NextConfig } from "next";

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

export default nextConfig;
