import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 15000,
    hookTimeout: 15000,
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
    },
    // Load .env file for DATABASE_URL etc.
    envFile: ".env",
  },
});
