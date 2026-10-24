import NextError from "next/error";

/**
 * The error page, exported as 404.html. Workers serves it at /404 with a 200;
 * the routed shell's fallback answers every other missing path. _app.tsx asks
 * search engines to leave it out and names no URL for it.
 */
export default function NotFound() {
  return <NextError statusCode={404} />;
}
