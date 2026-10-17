import { chromeCapabilities, config as sharedConfig } from "./wdio.shared.conf";

const headlessChromeCapabilities = {
  ...chromeCapabilities,
  "goog:chromeOptions": {
    ...chromeCapabilities["goog:chromeOptions"],
    args: [
      ...chromeCapabilities["goog:chromeOptions"].args,
      "--headless",
      "--no-sandbox",
      "--disable-dev-shm-usage",
    ],
  },
};

// Keep the shared spec reporter alone. A reporter that takes screenshots
// without waiting for them, as wdio-video-reporter does after clicks and at
// the end of each test, undoes viewport changes: when Chrome finishes a
// screenshot it restores the viewport it had when the screenshot began.
export const config: WebdriverIO.Config = {
  ...sharedConfig,
  capabilities: [headlessChromeCapabilities],
};
