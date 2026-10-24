import NextError from "next/error";

/**
 * The error page, exported as 404.html. Workers serves it, with a 404, for
 * every missing path and, with a 200, at /404, so _document.tsx asks search
 * engines to leave it out. Its links and assets are root-relative, so it works
 * at any depth.
 */
export default function NotFound() {
  return <NextError statusCode={404} />;
}
