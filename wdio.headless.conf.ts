import video from 'wdio-video-reporter';

import {chromeCapabilities, config as sharedConfig} from './wdio.shared.conf';

const headlessChromeCapabilities = {
  ...chromeCapabilities,
  'goog:chromeOptions': {
    ...chromeCapabilities['goog:chromeOptions'],
    prefs: {
      ...chromeCapabilities['goog:chromeOptions'].prefs,
    },
    args: [
      ...chromeCapabilities['goog:chromeOptions'].args,
      '--headless',
      '--disable-gpu',
      '--disable-features=NetworkService',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-software-rasterizer',
    ],
  },
};

export const config: WebdriverIO.Config = {
  ...sharedConfig,
  ...{
    capabilities: [headlessChromeCapabilities],
  },
  reporters: [
    [
      video,
      {
        saveAllVideos: true,
        videoSlowdownMultiplier: 3,
      },
    ],
  ],
};
