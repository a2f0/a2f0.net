import resume from "@a2f0/shared/resume.json";
import { RESUME_NAME } from "@a2f0/shared/resumeName";
import { extractLinks } from "@a2f0/shared/textUtils";

/** The resume's production home page, which every page names as canonical. */
export const RESUME_URL = "https://resume.a2f0.net/";

/** The color of the page's sticky header, for the browser's own chrome. */
export const THEME_COLOR = "#404040";

// Company names are Markdown and may link to the company's site.
const plainText = (markdown: string) => extractLinks(markdown).plainString;
const firstLink = (markdown: string) => extractLinks(markdown).matches[0]?.url;

const [latest, previous] = resume.experience;
const [degree] = resume.education;

/** A summary drawn from the resume's own entries, for search results. */
export const RESUME_DESCRIPTION = `${RESUME_NAME}'s resume: ${latest.title} at ${plainText(
  latest.company,
)} and ${previous.title} at ${plainText(previous.company)}, with a ${
  degree.credential
} from ${degree.institution}.`;

// Profiles that identify the person, rather than projects or companies.
const PROFILE_HOSTS = new Set(["github.com", "linkedin.com"]);
const isProfile = (url: string) =>
  PROFILE_HOSTS.has(new URL(url).hostname.replace(/^www\./, ""));

const current = /current$/i.test(latest.date_range);
const employerUrl = firstLink(latest.company);

/** Structured data for the resume's owner, using only what the page shows. */
export const RESUME_PERSON = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: RESUME_NAME,
  url: RESUME_URL,
  ...(current && {
    jobTitle: latest.title,
    worksFor: {
      "@type": "Organization",
      name: plainText(latest.company),
      ...(employerUrl && { url: employerUrl }),
    },
  }),
  homeLocation: { "@type": "Place", name: resume.city_state },
  alumniOf: resume.education.map(({ institution }) => ({
    "@type": "CollegeOrUniversity",
    name: institution,
  })),
  sameAs: resume.internet_presences.filter(isProfile),
};
