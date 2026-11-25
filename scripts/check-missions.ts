import { DT, MISSIONS, judge, lostInSpace, startState, step, touchesGround } from '../src/games/planet/physics.ts'
import { autopilot } from '../tests/autopilot.ts'
for (const m of MISSIONS) {
  const s = startState(m)
  let out = 'timeout'
  while (s.t < 90) {
    step(s, autopilot(s, m), DT)
    if (touchesGround(s)) {
      const j = judge(s, m)
      out = `${j.title} speed=${j.speed.toFixed(1)} tilt=${j.tilt.toFixed(1)} fuel=${j.fuel.toFixed(0)} t=${s.t.toFixed(1)} ${j.reasons.join(' | ')}`
      break
    }
    if (lostInSpace(s)) { out = 'lost'; break }
  }
  // ohne Steuerung
  const f = startState(m)
  let free = 'timeout'
  while (f.t < 90) { step(f, { left: false, right: false, thrust: false }); if (touchesGround(f)) { const j = judge(f, m); free = `${j.title} ${j.reasons.join(' | ')} t=${f.t.toFixed(1)}`; break } }
  console.log(`${m.id}: ${out}\n   ohne Steuerung: ${free}`)
}
