# FitCycle

FitCycle is an installable iPhone Progressive Web App (PWA) for adaptive 4-week training.

## Features
- 3–6 day workout generation
- Goal-specific programming
- 4-week progression with Week 4 deload
- Cardio scheduling
- Weight, reps and RIR logging
- Readiness inputs (sleep, soreness, stress, energy)
- Adaptive next-load suggestions based on prior performance and readiness
- Local on-device storage
- Offline PWA cache

## Publish from Windows with GitHub Pages
1. Create a new public GitHub repository named `fitcycle`.
2. Upload every file in this folder to the repository root.
3. Open repository Settings → Pages.
4. Under Build and deployment, choose "Deploy from a branch".
5. Choose the `main` branch and `/ (root)`, then Save.
6. Wait for GitHub Pages to provide the live URL.
7. Open that URL in Safari on the iPhone.
8. Tap Share → Add to Home Screen → Add.

Important: data is stored in Safari/local storage on the device. Clearing site data can erase workout history.

## 1RM-based programming
FitCycle v2 includes an estimated 1RM calculator using the Epley formula. Enter an exercise, weight, and reps to save an estimated 1RM. Compound-lift workouts then display the programmed percentage of 1RM and a rounded target working weight. Readiness can reduce the target by about 5–10% on lower-readiness days. Hard logged sets (RIR 0–2) can also refresh the saved estimated 1RM.

Current 4-week intensity progression:
- Strength: 75% / 80% / 85% / 65% deload
- Hypertrophy: 65% / 70% / 75% / 60% deload
- Fat loss/recomposition: 65% / 67.5% / 70% / 60% deload
- General fitness: 65% / 70% / 72.5% / 60% deload
