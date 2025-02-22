import fs from 'node:fs';

import {testDownloadDir} from './test/testDownloadDir';

export const chromeCapabilities = {
  maxInstances: 5,
  browserName: 'chrome',
  'wdio:chromedriverOptions': {},
  'goog:chromeOptions': {
    prefs: {
      directory_upgrade: true,
      prompt_for_download: false,
      'download.default_directory': testDownloadDir,
    },
    args: ['--window-size=1366,2160'],
  },
  acceptInsecureCerts: true,
};

export const config: WebdriverIO.Config = {
  runner: 'local',
  specs: ['./test/specs/**/*.ts'],
  exclude: [],
  maxInstances: 1,
  capabilities: [chromeCapabilities],
  logLevel: 'silent',
  bail: 0,
  baseUrl: 'http://localhost:4001',
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
  },
  onPrepare: async () => {
    if (!fs.existsSync(testDownloadDir)) {
      console.info(`Creating download directory: ${testDownloadDir}`);
      fs.mkdirSync(testDownloadDir);
    }
  },
  onComplete: async () => {
    fs.rm(testDownloadDir, {recursive: true}, err => {
      if (err) {
        throw err;
      }
      console.log(`Download directory ${testDownloadDir} was deleted.`);
    });
  },
};
