import { describe, expect, it } from 'vitest'
import { DT, MISSIONS, judge, lostInSpace, startState, step, touchesGround, type Mission } from '../src/games/planet/physics.ts'
import { autopilot } from './autopilot.ts'

function fly(m: Mission, pilot: (s: ReturnType<typeof startState>) => { left: boolean; right: boolean; thrust: boolean }) {
  const s = startState(m)
  while (s.t < 90) {
    step(s, pilot(s), DT)
    if (touchesGround(s)) return judge(s, m)
    if (lostInSpace(s)) return null
  }
  return null
}

describe('Kleiner Planet – Missionen', () => {
  for (const m of MISSIONS) {
    it(`${m.name}: mit dem Treibstoff sicher landbar (mit Reserve)`, () => {
      const res = fly(m, (s) => autopilot(s, m))
      expect(res?.landed).toBe(true)
      expect(res!.fuel).toBeGreaterThan(25)
    })

    it(`${m.name}: ohne Steuern gibt es eine Bruchlandung mit konkretem Grund`, () => {
      const res = fly(m, () => ({ left: false, right: false, thrust: false }))
      expect(res?.landed).toBe(false)
      expect(res!.reasons.length).toBeGreaterThan(0)
      expect(res!.reasons.join(' ')).toMatch(/Zu schnell|schräg|Kopfüber|neben der Landezone/)
    })
  }

  it('Vollgas nach oben endet im All', () => {
    const s = startState(MISSIONS[0])
    let lost = false
    while (s.t < 30 && !lost) {
      step(s, { left: false, right: false, thrust: true })
      lost = lostInSpace(s)
    }
    expect(lost).toBe(true)
  })
})
