// Physik für „Kleiner Planet“ – deterministisch und ohne DOM (testbar).
// Koordinaten: Mondmittelpunkt im Ursprung, y zeigt nach oben, Einheit = Meter.

export const MOON_R = 60
export const GM = 14 * MOON_R * MOON_R // 14 m/s² an der Oberfläche
export const THRUST = 32 // m/s²
export const TURN = 2.6 // rad/s
export const FUEL_BURN = 18 // % pro Sekunde Schub
export const MAX_SPEED = 9 // m/s beim Aufsetzen
export const MAX_TILT = 14 // Grad
export const DT = 1 / 120
export const SHIP_H = 16

/** Rumpfpunkte im Schiffskoordinatensystem (x = nach rechts, y = Richtung Spitze). */
export const HULL: [number, number][] = [
  [-7, -8],
  [7, -8],
  [0, 9],
  [-5, 4],
  [5, 4],
]

export interface Mission {
  id: string
  name: string
  hint: string
  zoneAngle: number // rad
  zoneHalf: number // rad
  start: { r: number; angle: number; vt: number; vr: number }
}

export const MISSIONS: Mission[] = [
  {
    id: 'sanft',
    name: 'Sanft runter',
    hint: 'Die Landezone liegt direkt unter dir. Bremse rechtzeitig und setz aufrecht auf.',
    zoneAngle: Math.PI / 2,
    zoneHalf: 0.24,
    start: { r: 150, angle: Math.PI / 2 + 0.06, vt: 0, vr: 0 },
  },
  {
    id: 'kurve',
    name: 'Um die Kurve',
    hint: 'Die Zone liegt rechts am Mond. Lass dich hinübertragen, dann bremsen.',
    zoneAngle: 0,
    zoneHalf: 0.24,
    start: { r: 140, angle: Math.PI / 2, vt: -9, vr: 0 },
  },
  {
    id: 'rueckseite',
    name: 'Rückseite',
    hint: 'Du fliegst um den Mond herum. Bremse, bevor du auf der Unterseite ankommst.',
    zoneAngle: -Math.PI / 2,
    zoneHalf: 0.22,
    start: { r: 115, angle: Math.PI / 2, vt: -17.6, vr: 0 },
  },
]

export interface Input {
  left: boolean
  right: boolean
  thrust: boolean
}

export interface ShipState {
  x: number
  y: number
  vx: number
  vy: number
  a: number // Richtung der Spitze (rad)
  fuel: number // 0..100
  t: number
  thrusting: boolean
}

export function startState(m: Mission): ShipState {
  const { r, angle, vt, vr } = m.start
  const ux = Math.cos(angle)
  const uy = Math.sin(angle)
  // tangential (gegen den Uhrzeigersinn) = (-uy, ux)
  return {
    x: ux * r,
    y: uy * r,
    vx: ux * vr - uy * vt,
    vy: uy * vr + ux * vt,
    a: angle,
    fuel: 100,
    t: 0,
    thrusting: false,
  }
}

export function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

export function step(s: ShipState, inp: Input, dt = DT): void {
  const r = Math.hypot(s.x, s.y)
  const g = GM / (r * r)
  let ax = (-s.x / r) * g
  let ay = (-s.y / r) * g
  if (inp.left) s.a += TURN * dt
  if (inp.right) s.a -= TURN * dt
  s.thrusting = inp.thrust && s.fuel > 0
  if (s.thrusting) {
    ax += Math.cos(s.a) * THRUST
    ay += Math.sin(s.a) * THRUST
    s.fuel = Math.max(0, s.fuel - FUEL_BURN * dt)
  }
  s.vx += ax * dt
  s.vy += ay * dt
  s.x += s.vx * dt
  s.y += s.vy * dt
  s.t += dt
}

export function hullWorld(s: ShipState): [number, number][] {
  // Schiffsachse: y_local zeigt Richtung s.a, x_local zeigt 90° im Uhrzeigersinn
  const cy = Math.cos(s.a)
  const sy = Math.sin(s.a)
  return HULL.map(([lx, ly]) => [s.x + ly * cy + lx * sy, s.y + ly * sy - lx * cy])
}

export function touchesGround(s: ShipState): boolean {
  return hullWorld(s).some(([x, y]) => x * x + y * y <= MOON_R * MOON_R)
}

export function altitude(s: ShipState): number {
  const low = Math.min(...hullWorld(s).map(([x, y]) => Math.hypot(x, y)))
  return Math.max(0, low - MOON_R)
}

export interface Telemetry {
  speed: number
  tilt: number // Grad
  zoneOffset: number // Meter außerhalb der Zone (0 = drin)
}

export function telemetry(s: ShipState, m: Mission): Telemetry {
  const phi = Math.atan2(s.y, s.x)
  const tilt = Math.abs(wrapAngle(s.a - phi)) * (180 / Math.PI)
  const d = Math.abs(wrapAngle(phi - m.zoneAngle))
  return {
    speed: Math.hypot(s.vx, s.vy),
    tilt,
    zoneOffset: Math.max(0, d - m.zoneHalf) * MOON_R,
  }
}

export interface Outcome {
  landed: boolean
  title: string
  reasons: string[]
  speed: number
  tilt: number
  fuel: number
}

const fmt1 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1, minimumFractionDigits: 1 })

export function judge(s: ShipState, m: Mission): Outcome {
  const t = telemetry(s, m)
  const reasons: string[] = []
  const tooFast = t.speed > MAX_SPEED
  const tooTilted = t.tilt > MAX_TILT
  const outside = t.zoneOffset > 0
  if (t.tilt > 100) reasons.push(`Kopfüber aufgeschlagen: ${Math.round(t.tilt)}° Neigung.`)
  else if (tooTilted) reasons.push(`Zu schräg: ${Math.round(t.tilt)}° Neigung – höchstens ${MAX_TILT}° sind erlaubt.`)
  if (tooFast) reasons.push(`Zu schnell: ${fmt1.format(t.speed)} m/s – höchstens ${MAX_SPEED} m/s sind erlaubt.`)
  if (outside) reasons.push(`${Math.round(t.zoneOffset)} m neben der Landezone aufgesetzt.`)
  if ((tooFast || tooTilted) && s.fuel <= 0) reasons.push('Der Tank war leer – ohne Schub kein Bremsen.')
  const landed = !tooFast && !tooTilted && !outside
  let title = 'Gelandet!'
  if (tooFast || tooTilted) title = 'Bruchlandung!'
  else if (outside) title = 'Sanft – aber daneben'
  return { landed, title, reasons, speed: t.speed, tilt: t.tilt, fuel: s.fuel }
}

export function lostInSpace(s: ShipState): boolean {
  return Math.hypot(s.x, s.y) > 420
}

/** Kurze Bahnvorschau ohne Steuereingaben. */
export function predict(s: ShipState, seconds: number, every = 0.12): [number, number][] {
  const c: ShipState = { ...s }
  const pts: [number, number][] = []
  const none = { left: false, right: false, thrust: false }
  let acc = 0
  for (let t = 0; t < seconds; t += DT) {
    step(c, none)
    acc += DT
    if (Math.hypot(c.x, c.y) <= MOON_R + 2) break
    if (acc >= every) {
      acc = 0
      pts.push([c.x, c.y])
    }
  }
  return pts
}
