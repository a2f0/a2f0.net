import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["__tests__/vitest.setup.ts"],
    // https://github.com/vitest-dev/vitest/issues/740
    maxWorkers: 1,
    minWorkers: 0,
  },
  plugins: [react()],
});
