import { parseDeployTier } from "./lib/deployTier";

export default {
  output: "export",
  transpilePackages: ["@a2f0/shared"],
  compiler: {
    styledComponents: true,
  },
  // Inlined into the server and browser bundles alike (see lib/deployTier.ts);
  // an unknown tier fails the build.
  env: {
    RESUME_DEPLOY_TIER: parseDeployTier(process.env.RESUME_DEPLOY_TIER),
  },
};
