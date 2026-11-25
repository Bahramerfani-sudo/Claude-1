import { describe, expect, it } from 'vitest'
import { SCALE, START_LEN, barHeight, makeRound } from '../src/games/ton/melody.ts'
import { accuracy, deviationText, makeTargets } from '../src/games/takt/logic.ts'

function rng(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
}

describe('Falscher Ton', () => {
  it('ändert beim zweiten Durchgang genau einen Ton', () => {
    const r = rng(1)
    for (let len = START_LEN; len <= 14; len++)
      for (let k = 0; k < 200; k++) {
        const round = makeRound(len, r)
        expect(round.a).toHaveLength(len)
        const diffs = round.a.map((n, i) => (n !== round.b[i] ? i : -1)).filter((i) => i >= 0)
        expect(diffs).toEqual([round.changed])
        for (const n of [...round.a, ...round.b]) expect(n >= 0 && n < SCALE.length).toBe(true)
      }
  })

  it('zeigt unterschiedliche Tonhöhen als unterschiedlich hohe Balken', () => {
    const heights = SCALE.map((_, i) => barHeight(i))
    expect(new Set(heights).size).toBe(SCALE.length)
    for (let i = 1; i < heights.length; i++) expect(heights[i]).toBeGreaterThan(heights[i - 1])
  })
})

describe('Innerer Takt', () => {
  it('formuliert die Abweichung verständlich', () => {
    expect(deviationText(9.77, 10)).toBe('0,23 Sekunden zu früh')
    expect(deviationText(10.5, 10)).toBe('0,50 Sekunden zu spät')
    expect(deviationText(11, 10)).toBe('1,00 Sekunde zu spät')
    expect(deviationText(10.002, 10)).toBe('Auf die Hundertstel genau!')
  })

  it('fünf Runden, die erste dauert zehn Sekunden, Zielzeiten wechseln', () => {
    const t = makeTargets(rng(3))
    expect(t).toHaveLength(5)
    expect(t[0]).toBe(10)
    expect(new Set(t).size).toBe(5)
  })

  it('berechnet die Treffsicherheit', () => {
    expect(accuracy([{ target: 10, elapsed: 10 }])).toBe(100)
    expect(accuracy([{ target: 10, elapsed: 9 }, { target: 10, elapsed: 11 }])).toBe(90)
  })
})
