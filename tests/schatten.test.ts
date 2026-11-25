import { describe, expect, it } from 'vitest'
import { OBJECTS, buildObject } from '../src/games/schatten/objects.ts'
import { PUZZLES, shadowQuaternion } from '../src/games/schatten/puzzles.ts'
import { bestMatch, iou, normalizedSilhouette } from './silhouette.ts'

// Ein Rätsel ist fair, wenn
//  1) der Schatten exakt der Projektion des richtigen Gegenstands entspricht und
//  2) keiner der beiden Köder – egal wie man ihn dreht oder skaliert – einen
//     annähernd gleichen Schatten werfen kann.
const DECOY_LIMIT = 0.91

describe('Schattenlabor – acht faire Rätsel', () => {
  it('hat acht Rätsel mit je drei verschiedenen, bekannten Gegenständen', () => {
    expect(PUZZLES).toHaveLength(8)
    for (const p of PUZZLES) {
      const ids = [p.answer, ...p.decoys]
      expect(new Set(ids).size).toBe(3)
      for (const id of ids) expect(OBJECTS[id]).toBeDefined()
    }
  })

  for (const p of PUZZLES) {
    it(`${OBJECTS[p.answer].name}: Schatten passt zur Form, Köder passen nicht`, () => {
      const q = shadowQuaternion(p)
      const target = normalizedSilhouette(buildObject(p.answer, 'low'), q)
      // Der Schatten im Spiel wird aus demselben Modell in derselben Lage gerendert.
      expect(iou(normalizedSilhouette(buildObject(p.answer, 'high'), q), target)).toBeGreaterThan(0.95)
      for (const d of p.decoys) {
        const best = bestMatch(buildObject(d, 'low'), target, 1500)
        expect(best.iou, `${d} kommt dem Schatten zu nahe`).toBeLessThan(DECOY_LIMIT)
      }
    }, 120_000)
  }
})
