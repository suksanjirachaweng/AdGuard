import { defineConfig } from "vitest/config";

// Backend tests (Node env). Frontend tests live under client/ with their own config.
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.js"],
  },
});
