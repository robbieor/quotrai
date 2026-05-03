The GitHub job is failing because the visual regression workflow is running Playwright screenshot comparisons, but the committed snapshot baseline folder is missing. After the recent UI/logo/theme changes, the current screenshots also need to become the new baseline.

Plan:

1. Add the missing visual snapshot baselines
   - Run the Playwright visual update command so it generates `e2e/visual.spec.ts-snapshots/` for the configured devices and public routes.
   - Commit the generated snapshot PNGs so GitHub has something stable to compare against.

2. Keep the visual checks active
   - Do not remove the workflow.
   - Keep the existing checks for horizontal scroll, tiny tap targets, console errors, and screenshot drift.
   - This preserves the protection against broken mobile layouts.

3. Verify the workflow locally
   - Run the visual test suite once after snapshots are generated.
   - If any real layout issue appears, fix that specific UI issue rather than disabling the test.

4. Optional cleanup if needed
   - If the workflow is too noisy after intentional brand/theme updates, update the README note so future UI changes include the snapshot update step.

Expected outcome:
- The recurring GitHub “Visual regression / playwright” failure stops.
- Future failures only appear when the UI genuinely changes or breaks, instead of failing because baselines are missing/outdated.