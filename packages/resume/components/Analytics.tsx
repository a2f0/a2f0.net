import { GoogleAnalytics } from "@next/third-parties/google";
import { useEffect, useState } from "react";

interface AnalyticsProps {
  gaId: string;
}

/**
 * Loads Google Analytics for real visitors only. Automated browsers, such as
 * the CI and local end-to-end runs, set `navigator.webdriver`, and their page
 * views should not reach analytics. The check runs after mount so the server
 * and client renders agree.
 */
export default function Analytics({ gaId }: AnalyticsProps) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(!navigator.webdriver);
  }, []);

  return enabled ? <GoogleAnalytics gaId={gaId} /> : null;
}
