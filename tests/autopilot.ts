// Ein einfacher Autopilot: Beweis, dass jede Mission mit dem Treibstoff machbar ist.
import { GM, MOON_R, THRUST, wrapAngle, type Input, type Mission, type ShipState } from '../src/games/planet/physics.ts'

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

export function autopilot(s: ShipState, m: Mission): Input {
  const r = Math.hypot(s.x, s.y)
  const ux = s.x / r
  const uy = s.y / r
  const tx = -uy
  const ty = ux
  const phi = Math.atan2(s.y, s.x)
  const vr = s.vx * ux + s.vy * uy
  const vt = s.vx * tx + s.vy * ty
  const arc = wrapAngle(m.zoneAngle - phi) * r
  const h = r - MOON_R - 8
  const near = Math.abs(arc) < 10
  const vtWant = clamp(arc * 0.3, -20, 20)
  const vrWant = near ? -clamp(Math.sqrt(2 * 9 * Math.max(h, 0)) * 0.55, 2.5, 20) : clamp((28 - h) * 0.5, -12, 12)
  const g = GM / (r * r)
  const tau = 0.7
  const ar = (vrWant - vr) / tau + g
  const at = (vtWant - vt) / tau
  let theta = Math.atan2(ar * uy + at * ty, ar * ux + at * tx)
  if (h < 14) theta = phi + clamp(wrapAngle(theta - phi), -0.12, 0.12)
  const err = wrapAngle(theta - s.a)
  const need = Math.hypot(ar, at)
  return {
    left: err > 0.04,
    right: err < -0.04,
    thrust: Math.abs(err) < 0.35 && need > THRUST * 0.5,
  }
}
