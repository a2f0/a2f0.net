import { serializeJsonLd } from "@a2f0/shared/jsonLd";
import Head from "next/head";

import { DEPLOY_TIER } from "../lib/deployTier";
import {
  OG_IMAGE,
  RESUME_DESCRIPTION,
  RESUME_PERSON,
  RESUME_URL,
  THEME_COLOR,
} from "../lib/metadata";

interface PageMetadataProps {
  /** The page's title, which link previews show. */
  title: string;
}

/**
 * Search and link-preview metadata. Each page shows the one resume, so each
 * names the home page as canonical. Staging names no canonical URL: its pages
 * are kept out of search results, and a canonical would point search engines
 * at production from a page they were asked to drop.
 */
export default function PageMetadata({ title }: PageMetadataProps) {
  const production = DEPLOY_TIER === "production";
  return (
    <Head>
      <meta name="description" content={RESUME_DESCRIPTION} key="description" />
      <meta name="theme-color" content={THEME_COLOR} key="theme-color" />
      {production && <link rel="canonical" href={RESUME_URL} key="canonical" />}
      <meta property="og:type" content="profile" key="og:type" />
      <meta property="og:site_name" content="a2f0.net" key="og:site_name" />
      <meta property="og:title" content={title} key="og:title" />
      <meta
        property="og:description"
        content={RESUME_DESCRIPTION}
        key="og:description"
      />
      {production && (
        <meta property="og:url" content={RESUME_URL} key="og:url" />
      )}
      <meta property="og:image" content={OG_IMAGE.url} key="og:image" />
      <meta
        property="og:image:width"
        content={String(OG_IMAGE.width)}
        key="og:image:width"
      />
      <meta
        property="og:image:height"
        content={String(OG_IMAGE.height)}
        key="og:image:height"
      />
      <meta property="og:image:alt" content={OG_IMAGE.alt} key="og:image:alt" />
      <meta
        name="twitter:card"
        content="summary_large_image"
        key="twitter:card"
      />
      <script
        type="application/ld+json"
        key="person"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: The JSON-LD is built from checked-in resume data and escapes "<".
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(RESUME_PERSON) }}
      />
    </Head>
  );
}
