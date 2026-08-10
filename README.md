# FitCycle v4

FitCycle is an installable PWA for adaptive 4-week strength and conditioning blocks.

## v4 changes
- Saved estimated 1RM now drives both the prescribed weight **and** prescribed reps for percentage-based primary lifts.
- The 4-week block progresses intensity by goal; each week's rep target is derived from that intensity.
- Workout cards show a direct prescription such as `Rx 205 lb × 5` alongside `% 1RM`.
- Readiness still reduces the prescribed load when recovery is moderate or low, while the programmed rep target remains visible.
- Set-by-set Weight / Reps / RIR logging remains embedded directly in every exercise card.
- Hard logged sets can update the estimated 1RM for future prescriptions.
- Cache version bumped to v4 so GitHub Pages/iPhone installations refresh more reliably.

## Example strength progression
A saved 1RM is translated into training prescriptions approximately like:
- Week 1: 75% × 6 reps
- Week 2: 80% × 5 reps
- Week 3: 85% × 4 reps
- Week 4 deload: 65% × 8 reps

Other goals use their own percentage progression and matching rep targets.

## GitHub Pages
Upload the individual files in this folder to the repository root, not the ZIP file. Make sure `index.html` is visible at the repository root. In Settings > Pages, deploy from `main` and `/ (root)`.
