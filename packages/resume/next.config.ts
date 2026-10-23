export default {
  output: "export",
  transpilePackages: ["@a2f0/shared"],
  compiler: {
    styledComponents: true,
  },
  // Inlined into the server and browser bundles alike. lib/deployTier.ts
  // validates it as the pages render, so an unknown tier fails the build.
  env: {
    RESUME_DEPLOY_TIER: process.env.RESUME_DEPLOY_TIER ?? "",
  },
};
