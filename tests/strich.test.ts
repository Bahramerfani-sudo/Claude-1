import { describe, expect, it } from 'vitest'
import { lineLength, lineProblem, resampleLine, simulate } from '../src/games/strich/engine.ts'
import { HERO_LEVEL, LEVELS } from '../src/games/strich/levels.ts'

describe('Ein Strich – jedes Level ist mit genau einer Linie lösbar', () => {
  for (const level of [...LEVELS, HERO_LEVEL]) {
    it(`${level.name}: hinterlegte Lösung trifft den Becher`, () => {
      const line = resampleLine(level.solution, level.ink)
      expect(line.length).toBeGreaterThan(4)
      expect(lineLength(line)).toBeLessThanOrEqual(level.ink)
      expect(lineProblem(level, line)).toBeNull()
      expect(simulate(level, line).status).toBe('won')
    })

    it(`${level.name}: ohne Strich geht es nicht`, () => {
      expect(simulate(level, []).status).toBe('lost')
    })

    it(`${level.name}: Lösung verzeiht kleine Zitterer`, () => {
      // Menschen zeichnen nie exakt – leicht verschobene Linien sollen meist auch gehen.
      let ok = 0
      const shifts = [-6, -3, 0, 3, 6]
      for (const dx of shifts)
        for (const dy of shifts) {
          const moved = level.solution.map((p) => ({ x: p.x + dx, y: p.y + dy }))
          const line = resampleLine(moved, level.ink)
          if (!lineProblem(level, line) && simulate(level, line).status === 'won') ok++
        }
      expect(ok / (shifts.length * shifts.length)).toBeGreaterThanOrEqual(0.6)
    })
  }

  it('fünf Level mit unterschiedlichen Hindernissen', () => {
    expect(LEVELS).toHaveLength(5)
    const features = LEVELS.map((l) =>
      [l.walls.length && 'Wand', l.spikes.length && 'Stacheln', l.noDraw.length && 'Sperrzone', l.bouncers.length && 'Trampolin', l.winds.length && 'Wind', l.pegs.length && 'Stifte']
        .filter(Boolean)
        .join('+'),
    )
    expect(new Set(features).size).toBe(5)
  })
})
