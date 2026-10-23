import type { NextConfig } from "next";

const config: NextConfig = {
  output: "export",
  agentRules: false,
  // The theme switch's package imports its own stylesheets.
  transpilePackages: ["@tearleads/windowing"],
  webpack(config) {
    // Loro's browser build imports WASM as an async module in development.
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    config.output.environment = {
      ...config.output.environment,
      asyncFunction: true,
    };
    return config;
  },
};
export default config;
