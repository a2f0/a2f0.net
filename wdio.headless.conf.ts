import video from 'wdio-video-reporter';
import {chromeCapabilities, config as sharedConfig} from './wdio.shared.conf';

const headlessChromeCapabilities = {
  ...chromeCapabilities,
  'goog:chromeOptions': {
    ...chromeCapabilities['goog:chromeOptions'],
    args: [
      ...chromeCapabilities['goog:chromeOptions'].args,
      '--headless',
      '--no-sandbox',
      '--disable-dev-shm-usage'
    ]
  }
};

export const config: WebdriverIO.Config = {
  ...sharedConfig,
  ...{
    capabilities: [headlessChromeCapabilities],
  },
  reporters: [
    'spec',
    [
      video,
      {
        saveAllVideos: true,
        videoSlowdownMultiplier: 3,
        outputDir: '_results_'
      }
    ]
  ]
};
