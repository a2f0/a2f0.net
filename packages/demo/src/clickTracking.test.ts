import { testStandaloneClickTracking } from "@a2f0/testing/standaloneClickTracking";

testStandaloneClickTracking({
  app: "demo",
  load: () => import("./clickTracking"),
});
