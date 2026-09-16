import { reviewOutputProblem } from "./reviewOutput";

/** The environment a spawned reviewer runs with; it replaces, not extends. */
export type ReviewerEnv = Record<string, string | undefined>;

/** One reviewer-CLI run: its exit code and the review text it produced. */
interface ReviewAttempt {
  readonly exitCode: number;
  readonly review: string;
}

/**
 * Attempts per review. Two, not more: the degenerate-output failure this
 * guards — a reviewer exiting 0 having produced no verdict-signed review — is
 * stochastic and rare, so one retry converts most flakes into reviews, while
 * more would stack multi-minute runs behind a reviewer that is genuinely
 * broken.
 */
export const MAX_REVIEW_ATTEMPTS = 2;

/**
 * Run a reviewer up to `MAX_REVIEW_ATTEMPTS` times, relay the review it
 * settles on, and map the outcome to an exit code.
 *
 * A nonzero CLI exit is returned as-is with no retry — those failures (auth,
 * credits, missing binary) are deterministic, and retrying stacks minutes on a
 * lost cause. An exit-0 run whose output fails the verdict gate is retried;
 * only the final attempt's output is relayed, so a caller never reads a
 * discarded degenerate attempt as the review.
 *
 * Node may partially write a large payload to a pipe with writeSync. Use its
 * buffered stdout stream and let index.ts set process.exitCode so queued output
 * drains before the process exits, including the trailing verdict.
 */
export function relayReviewWithRetry(
  command: string,
  runAttempt: () => ReviewAttempt,
): number {
  let last: ReviewAttempt = { exitCode: 1, review: "" };
  for (let attempt = 1; attempt <= MAX_REVIEW_ATTEMPTS; attempt += 1) {
    last = runAttempt();
    if (last.exitCode !== 0) {
      process.stdout.write(last.review);
      return last.exitCode;
    }
    const problem = reviewOutputProblem(last.review);
    if (problem === null) {
      process.stdout.write(last.review);
      return 0;
    }
    process.stderr.write(
      `${command} exited 0 but produced no usable review (attempt ${attempt}/${MAX_REVIEW_ATTEMPTS}): ${problem}\n`,
    );
  }
  process.stdout.write(last.review);
  return 1;
}
