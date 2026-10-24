/**
 * The Worker a build is for. One export serves either resume Worker, so the
 * build reads RESUME_DEPLOY_TIER: staging builds ask search engines not to
 * index or follow anything, and production builds, the default, name their
 * canonical URLs and sitemap instead. The deploy guard refuses an export
 * built for the other tier.
 */
export type DeployTier = "production" | "staging";

/** The error page's route. Workers serves it for every missing path, too. */
export const ERROR_PAGE = "/404";

/**
 * The robots meta tag's content for a page, if it needs one. Staging asks
 * search engines to drop every page. Production asks only for the error page,
 * which Workers also answers at its own path, /404, with a 200; it names no
 * canonical URL and isn't in the sitemap.
 */
export function robotsDirectives(
  tier: DeployTier,
  page: string,
): string | undefined {
  if (tier === "staging") return "noindex, nofollow";
  return page === ERROR_PAGE ? "noindex" : undefined;
}

export function parseDeployTier(value: string | undefined): DeployTier {
  if (value === undefined || value === "" || value === "production")
    return "production";
  if (value === "staging") return "staging";
  throw new Error("RESUME_DEPLOY_TIER must be production or staging");
}

// next.config.ts inlines the variable into both the server and the browser
// bundles, so the page hydrates with the tier it was exported with. The
// export renders every page through _document.tsx, which reads this, so an
// unknown tier stops the build.
export const DEPLOY_TIER = parseDeployTier(process.env.RESUME_DEPLOY_TIER);
