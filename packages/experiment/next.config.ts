import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { NextConfig } from "next";

// A `bun link`ed package resolves imports from its real path, which would load
// the linked checkout's own React. Pin every import to this app's copy.
const require = createRequire(join(import.meta.dirname, "package.json"));
const packageDirectory = (name: string) =>
  dirname(require.resolve(`${name}/package.json`));

const nextConfig: NextConfig = {
  output: "export",
  agentRules: false,
  transpilePackages: ["@a2f0/shared", "@a2f0/website", "@tearleads/windowing"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      react: packageDirectory("react"),
      "react-dom": packageDirectory("react-dom"),
    };
    // `?raw` imports a file's text, such as the website's index.html.
    config.module.rules.push({ resourceQuery: /raw/, type: "asset/source" });
    return config;
  },
};

export default nextConfig;
