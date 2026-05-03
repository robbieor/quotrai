import { defineConfig, devices } from "@playwright/test";

/**
 * Visual regression suite for mobile-native polish.
 * Captures full-page screenshots at iOS + Android viewports for key public routes.
 * On failure, diffs are written to `test-results/` so layout drift is caught
 * before the app ever ships to TestFlight.
 */
const PORT = Number(process.env.PORT || 4173);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  expect: {
    // Pixel diff tolerance — covers font hinting / sub-pixel jitter without
    // hiding genuine layout regressions.
    toHaveScreenshot: { maxDiffPixelRatio: 0.02 },
  },
  projects: [
    {
      name: "iphone-13",
      use: { ...devices["iPhone 13"] },
    },
    {
      name: "iphone-se",
      use: { ...devices["iPhone SE"] },
    },
    {
      name: "pixel-7",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "ipad-mini",
      use: { ...devices["iPad Mini"] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `bun run build && bun run preview --port ${PORT} --strictPort`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
