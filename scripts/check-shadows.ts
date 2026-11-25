// Prüft, dass kein Köder-Gegenstand den Rätsel-Schatten werfen kann.
// Aufruf: node --experimental-strip-types scripts/check-shadows.ts [ascii]
import { buildObject } from '../src/games/schatten/objects.ts'
import { PUZZLES, shadowQuaternion } from '../src/games/schatten/puzzles.ts'
import { ascii, bestMatch, normalizedSilhouette } from '../tests/silhouette.ts'

for (const p of PUZZLES) {
  const target = normalizedSilhouette(buildObject(p.answer, 'low'), shadowQuaternion(p))
  if (process.argv[2] === 'ascii') console.log(ascii(target))
  const res = p.decoys.map((d) => `${d}=${bestMatch(buildObject(d, 'low'), target).iou.toFixed(3)}`)
  console.log(`${p.answer}: ${res.join('  ')}`)
}

// Kalibrierung: Wie gut findet die Suche den richtigen Gegenstand selbst?
if (process.argv[2] === 'calib') {
  for (const p of PUZZLES) {
    const target = normalizedSilhouette(buildObject(p.answer, 'low'), shadowQuaternion(p))
    console.log(`  selbst ${p.answer}: ${bestMatch(buildObject(p.answer, 'low'), target, 500, 99).iou.toFixed(3)}`)
  }
}
