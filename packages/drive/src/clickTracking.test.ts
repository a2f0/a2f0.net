import { testStandaloneClickTracking } from "@a2f0/testing/standaloneClickTracking";

testStandaloneClickTracking({
  app: "drive",
  load: () => import("./clickTracking"),
});
