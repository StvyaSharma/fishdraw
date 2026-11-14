import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:3047', trace: 'retain-on-failure',
    // p5.brush paints with WebGL2; headless Chromium provides it through SwiftShader.
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  // Watercolour painting saturates a software GPU, so the painting specs run
  // only after every line-drawing spec has finished.
  projects: [
    { name: 'desktop', testIgnore: /painting/, use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1100 } } },
    { name: 'mobile', testIgnore: /painting/, use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
    { name: 'desktop painting', testMatch: /painting/, dependencies: ['desktop', 'mobile'], use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1100 } } },
    { name: 'mobile painting', testMatch: /painting/, dependencies: ['desktop painting'], use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: 'bun run build && PORT=3047 bun server.ts',
    url: 'http://127.0.0.1:3047',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
