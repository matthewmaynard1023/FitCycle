# FitCycle v3

FitCycle is an installable PWA for adaptive 4-week strength and conditioning blocks.

## v3 changes
- Prominent 1 Rep Max Calculator at the top of the app.
- Estimated 1RM is saved per exercise and used for percentage-based load targets.
- Each workout exercise now contains its own set-by-set Weight / Reps / RIR tracker.
- Logged sets can update estimated 1RM when a hard set (RIR <= 2) is recorded.
- Recent performance appears directly in the workout card.
- Missing 1RM values can be added from the exercise card with the + Add 1RM shortcut.
- Service-worker cache version bumped to reduce stale-app issues after GitHub Pages updates.

## GitHub Pages
Upload the individual files in this folder to the repository root, not the ZIP file. Make sure `index.html` is visible at the repository root. In Settings > Pages, deploy from `main` and `/ (root)`.
