# Visual regression suite

Catches layout / sizing issues at iOS + Android breakpoints **before**
the app reaches TestFlight.

## Run locally

```bash
# First time: install browser binaries (~150MB)
bunx playwright install --with-deps chromium webkit

# Run against built app at all device breakpoints
bun run test:visual

# Update baselines after an intentional UI change
bun run test:visual:update

# View the HTML report (diffs side-by-side)
bunx playwright show-report
```

## Devices covered

| Project       | Width × Height | Why                          |
| ------------- | -------------- | ---------------------------- |
| `iphone-se`   | 375 × 667      | Smallest current iPhone      |
| `iphone-13`   | 390 × 844      | Modern iPhone baseline       |
| `pixel-7`     | 412 × 915      | Android baseline             |
| `ipad-mini`   | 768 × 1024     | Tablet / split-view boundary |

## What it asserts per route

1. **No horizontal scrolling** at the device width — catches `min-w-`
   overruns and oversized tables.
2. **No sub-32px tap targets** — catches buttons that shrink on mobile.
3. **No console / page errors** during render.
4. **Pixel diff** against committed baseline (≤ 2% pixel ratio change).

## Baselines

Stored in `e2e/visual.spec.ts-snapshots/` and committed to git.
Regenerate after intentional design changes with `bun run test:visual:update`.

## Authenticated routes

Public routes are covered out-of-the-box. To extend coverage to the
dashboard / quotes / invoices etc., set `TEST_EMAIL` + `TEST_PASSWORD`
in your env and add an `auth.spec.ts` that signs in once via
`storageState` then visits the protected routes.
