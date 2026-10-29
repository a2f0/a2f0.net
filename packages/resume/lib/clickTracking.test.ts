import { testStandaloneClickTracking } from "@a2f0/testing/standaloneClickTracking";

testStandaloneClickTracking({
  app: "resume",
  load: () => import("./clickTracking"),
});
