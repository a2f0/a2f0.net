import type { NextConfig } from "next";

const config: NextConfig = {
  output: "export",
  agentRules: false,
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
