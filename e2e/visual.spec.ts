import { test, expect } from "@playwright/test";

/**
 * Public routes that don't require authentication. These are the ones most
 * likely to surface layout/sizing issues at iOS/Android breakpoints because
 * they're the user's first contact with the product.
 *
 * For authenticated routes, see `auth.spec.ts` (skipped unless TEST_EMAIL +
 * TEST_PASSWORD env vars are provided).
 */
const PUBLIC_ROUTES: { name: string; path: string }[] = [
  { name: "landing", path: "/" },
  { name: "login", path: "/login" },
  { name: "signup", path: "/signup" },
  { name: "pricing", path: "/pricing" },
  { name: "industries", path: "/industries" },
  { name: "request-access", path: "/request-access" },
];

for (const route of PUBLIC_ROUTES) {
  test(`visual: ${route.name}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto(route.path, { waitUntil: "networkidle" });

    // Disable animations + caret blink so screenshots are deterministic.
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
          caret-color: transparent !important;
        }
      `,
    });

    // Layout assertions catch the most painful real-world bugs that
    // pixel diffs alone miss.
    const bodyScrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    const viewportWidth = page.viewportSize()?.width ?? 0;
    expect(
      bodyScrollWidth,
      `${route.name} should not horizontally scroll at ${viewportWidth}px`,
    ).toBeLessThanOrEqual(viewportWidth + 1);

    // Catch tiny tap targets — Apple HIG requires 44pt minimum.
    const tinyTargets = await page.$$eval(
      'button, a[href], [role="button"]',
      (els) =>
        els
          .filter((el) => {
            const r = (el as HTMLElement).getBoundingClientRect();
            // Ignore zero-size (hidden / collapsed) and decorative inline links.
            if (r.width === 0 || r.height === 0) return false;
            return r.height < 32 || r.width < 32;
          })
          .map((el) => (el as HTMLElement).outerHTML.slice(0, 120))
          .slice(0, 5),
    );
    expect(
      tinyTargets,
      `Tap targets smaller than 32px on ${route.name}`,
    ).toEqual([]);

    expect(errors, `Console/page errors on ${route.name}`).toEqual([]);

    await expect(page).toHaveScreenshot(`${route.name}.png`, {
      fullPage: true,
    });
  });
}
