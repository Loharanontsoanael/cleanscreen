import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // The real package throws outside a React Server Component build.
      "server-only": path.resolve(__dirname, "tests/server-only.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    // No disk cache and no real key: tests never reach the Clocked API.
    env: { CLOCKED_CACHE_DIR: "", CLOCKED_API_KEY: "test-key", CLOCKED_CONCURRENCY: "4" },
    testTimeout: 20_000,
  },
});
