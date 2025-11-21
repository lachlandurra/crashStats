import { defineConfig } from "@playwright/test";
import path from "path";

const PORT = 3000;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  reporter: "list",
  timeout: 120_000,
  expect: {
    timeout: 10_000
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`,
    headless: true
  },
  globalSetup: path.resolve("tests/e2e/global-setup.ts"),
  webServer: {
    command: `HOSTNAME=127.0.0.1 PORT=${PORT} NEXT_PUBLIC_E2E=true DUCKDB_DATABASE=test-data/e2e.duckdb node scripts/dev-server.js`,
    url: `http://127.0.0.1:${PORT}`,
    stdout: "pipe",
    stderr: "pipe",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_E2E: "true",
      DUCKDB_DATABASE: "test-data/e2e.duckdb",
      NEXT_PUBLIC_DATA_VERSION: process.env.NEXT_PUBLIC_DATA_VERSION ?? "E2E Fixture"
    }
  }
});
