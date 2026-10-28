# Regression fixtures

`original-output.json` records SHA-256 hashes of coordinate JSON from the original `fishdraw.js` at commit `a514372de1d05b4aa32a9e35aadec9a5299689a2`, executed with Bun 1.4.3. Each seed ran in a fresh process so the original global noise table did not carry over.

Before hashing, two-point strokes shorter than 0.9 drawing units were removed. This accounts for the intentional fix to the original cleanup distance check, which read the first two polylines instead of the two points of the current stroke. All other coordinate values and stroke ordering are unchanged.

Keep these fixtures independent of the TypeScript implementation. Do not regenerate them from the migrated generator to make a failing regression pass.
