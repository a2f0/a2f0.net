import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [react()],
        test: {
          name: "app",
          include: ["__tests__/**/*.test.{ts,tsx}"],
          globals: true,
          environment: "jsdom",
          setupFiles: ["__tests__/vitest.setup.ts"],
        },
      },
      {
        test: {
          name: "agent-tool",
          include: ["packages/agent-tool/src/**/*.test.ts"],
          environment: "node",
        },
      },
    ],
  },
});
