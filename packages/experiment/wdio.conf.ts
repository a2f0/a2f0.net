export const config: WebdriverIO.Config = {
  runner: "local",
  specs: ["./test/specs/**/*.e2e.ts"],
  maxInstances: 1,
  capabilities: [
    {
      browserName: "chrome",
      "goog:chromeOptions": {
        args: [
          "--headless",
          "--no-sandbox",
          "--disable-dev-shm-usage",
          "--window-size=1440,900",
        ],
      },
    },
  ],
  logLevel: "error",
  baseUrl: process.env.EXPERIMENT_BASE_URL ?? "http://localhost:4003",
  waitforTimeout: 10000,
  framework: "mocha",
  reporters: ["spec"],
  mochaOpts: {
    ui: "bdd",
    timeout: 60000,
  },
};
