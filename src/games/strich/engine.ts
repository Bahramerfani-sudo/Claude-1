// Deterministische Mini-Physik für „Ein Strich“.
// Wird vom Spiel, vom Titelbild und von den Lösbarkeits-Tests gemeinsam genutzt.

export interface Vec {
  x: number
  y: number
}
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}
export interface Circle {
  x: number
  y: number
  r: number
}
export interface Bouncer {
  a: Vec
  b: Vec
}
export interface Wind extends Rect {
  /** Beschleunigung in px/s² */
  fx: number
  fy: number
}

export interface Level {
  id: string
  name: string
  /** Ein Satz, der genau dort steht, wo man ihn braucht. */
  hint: string
  width: number
  height: number
  ball: Vec
  /** Innenraum des Zielbechers */
  goal: Rect
  walls: Rect[]
  spikes: Rect[]
  noDraw: Rect[]
  bouncers: Bouncer[]
  pegs: Circle[]
  winds: Wind[]
  /** maximale Strichlänge in px */
  ink: number
  /** Nachweis: eine einzelne Linie, die das Level löst (wird getestet). */
  solution: Vec[]
}

export const BALL_R = 12
export const LINE_HALF = 3
export const GRAVITY = 900
export const DT = 1 / 240
export const MAX_TIME = 14
export const CUP_WALL = 8
export const POINT_SPACING = 5
export const MIN_LINE = 24

const LINE_E = 0.22
const WALL_E = 0.3
const PEG_E = 0.45
/** Das Trampolin feuert immer gleich stark entlang seiner Normalen. */
const BOUNCER_SPEED = 820
/** Anteil der Geschwindigkeit entlang des Trampolins, der erhalten bleibt */
const BOUNCER_KEEP = 0.35

type Kind = 'line' | 'wall' | 'bouncer' | 'peg'

interface Seg {
  ax: number
  ay: number
  bx: number
  by: number
  half: number
  kind: Kind
}

export type LoseReason = 'spikes' | 'out' | 'stuck' | 'time'

export interface SimState {
  x: number
  y: number
  vx: number
  vy: number
  angle: number
  t: number
  slowFor: number
  status: 'running' | 'won' | 'lost'
  reason?: LoseReason
}

export interface HitEvent {
  kind: Kind
  speed: number
}

export function cupWalls(goal: Rect): Rect[] {
  const w = CUP_WALL
  return [
    { x: goal.x - w, y: goal.y, w, h: goal.h + w },
    { x: goal.x + goal.w, y: goal.y, w, h: goal.h + w },
    { x: goal.x - w, y: goal.y + goal.h, w: goal.w + 2 * w, h: w },
  ]
}

function rectSegs(r: Rect, kind: Kind = 'wall'): Seg[] {
  const x2 = r.x + r.w
  const y2 = r.y + r.h
  return [
    { ax: r.x, ay: r.y, bx: x2, by: r.y, half: 0, kind },
    { ax: x2, ay: r.y, bx: x2, by: y2, half: 0, kind },
    { ax: x2, ay: y2, bx: r.x, by: y2, half: 0, kind },
    { ax: r.x, ay: y2, bx: r.x, by: r.y, half: 0, kind },
  ]
}

export class World {
  readonly level: Level
  private segs: Seg[] = []
  private pegs: Circle[]
  state: SimState
  line: Vec[]

  constructor(level: Level, line: Vec[]) {
    this.level = level
    this.line = line
    for (const w of [...level.walls, ...cupWalls(level.goal)]) this.segs.push(...rectSegs(w))
    for (const b of level.bouncers) {
      this.segs.push({ ax: b.a.x, ay: b.a.y, bx: b.b.x, by: b.b.y, half: 4, kind: 'bouncer' })
    }
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1]
      const b = line[i]
      this.segs.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, half: LINE_HALF, kind: 'line' })
    }
    this.pegs = level.pegs
    this.state = {
      x: level.ball.x,
      y: level.ball.y,
      vx: 0,
      vy: 0,
      angle: 0,
      t: 0,
      slowFor: 0,
      status: 'running',
    }
  }

  /** Ein fester Physikschritt. Gibt Treffer zurück (für Geräusche). */
  step(hits?: HitEvent[]): void {
    const s = this.state
    if (s.status !== 'running') return
    const L = this.level

    let ax = 0
    let ay = GRAVITY
    for (const w of L.winds) {
      if (s.x >= w.x && s.x <= w.x + w.w && s.y >= w.y && s.y <= w.y + w.h) {
        ax += w.fx
        ay += w.fy
      }
    }
    s.vx += ax * DT
    s.vy += ay * DT
    s.vx *= 0.9997
    s.vy *= 0.9997
    s.x += s.vx * DT
    s.y += s.vy * DT
    s.t += DT

    // Kollisionen: tiefste Durchdringung zuerst, mehrfach iteriert
    for (let iter = 0; iter < 4; iter++) {
      let best = 0
      let nx = 0
      let ny = 0
      let kind: Kind = 'wall'
      for (const g of this.segs) {
        const dx = g.bx - g.ax
        const dy = g.by - g.ay
        const len2 = dx * dx + dy * dy
        let u = len2 > 0 ? ((s.x - g.ax) * dx + (s.y - g.ay) * dy) / len2 : 0
        if (u < 0) u = 0
        else if (u > 1) u = 1
        const cx = g.ax + dx * u
        const cy = g.ay + dy * u
        const ex = s.x - cx
        const ey = s.y - cy
        const d2 = ex * ex + ey * ey
        const minD = BALL_R + g.half
        if (d2 < minD * minD) {
          const d = Math.sqrt(d2)
          const pen = minD - d
          if (pen > best) {
            best = pen
            if (d > 1e-6) {
              nx = ex / d
              ny = ey / d
            } else {
              // genau auf der Linie: Normale senkrecht zur Linie nach oben
              const l = Math.sqrt(len2) || 1
              nx = dy / l
              ny = -dx / l
              if (ny > 0) {
                nx = -nx
                ny = -ny
              }
            }
            kind = g.kind
          }
        }
      }
      for (const p of this.pegs) {
        const ex = s.x - p.x
        const ey = s.y - p.y
        const d2 = ex * ex + ey * ey
        const minD = BALL_R + p.r
        if (d2 < minD * minD) {
          const d = Math.sqrt(d2) || 1e-6
          const pen = minD - d
          if (pen > best) {
            best = pen
            nx = ex / d
            ny = ey / d
            kind = 'peg'
          }
        }
      }
      if (best <= 0) break

      s.x += nx * best
      s.y += ny * best
      const vn = s.vx * nx + s.vy * ny
      if (vn < 0) {
        if (kind === 'bouncer') {
          const tx = -ny
          const ty = nx
          const vt = (s.vx * tx + s.vy * ty) * BOUNCER_KEEP
          s.vx = nx * BOUNCER_SPEED + tx * vt
          s.vy = ny * BOUNCER_SPEED + ty * vt
          hits?.push({ kind, speed: BOUNCER_SPEED })
        } else {
          const base = kind === 'line' ? LINE_E : kind === 'peg' ? PEG_E : WALL_E
          const e = -vn < 40 ? 0 : base
          s.vx -= (1 + e) * vn * nx
          s.vy -= (1 + e) * vn * ny
          // leichte Reibung entlang der Fläche
          const tx = -ny
          const ty = nx
          const vt = s.vx * tx + s.vy * ty
          const f = kind === 'line' ? 0.0015 : 0.004
          s.vx -= tx * vt * f
          s.vy -= ty * vt * f
          if (-vn > 70) hits?.push({ kind, speed: -vn })
        }
      }
    }

    s.angle += (s.vx * DT) / BALL_R

    // Ziel?
    const goal = L.goal
    if (s.x > goal.x && s.x < goal.x + goal.w && s.y > goal.y + BALL_R * 0.6 && s.y < goal.y + goal.h + 2) {
      s.status = 'won'
      return
    }
    // Stacheln?
    for (const sp of L.spikes) {
      const cx = Math.max(sp.x, Math.min(s.x, sp.x + sp.w))
      const cy = Math.max(sp.y, Math.min(s.y, sp.y + sp.h))
      const dx = s.x - cx
      const dy = s.y - cy
      if (dx * dx + dy * dy < (BALL_R - 2) * (BALL_R - 2)) {
        s.status = 'lost'
        s.reason = 'spikes'
        return
      }
    }
    if (s.x < -40 || s.x > L.width + 40 || s.y > L.height + 40 || s.y < -300) {
      s.status = 'lost'
      s.reason = 'out'
      return
    }
    const speed = Math.hypot(s.vx, s.vy)
    s.slowFor = speed < 8 ? s.slowFor + DT : 0
    if (s.slowFor > 1.2) {
      s.status = 'lost'
      s.reason = 'stuck'
      return
    }
    if (s.t > MAX_TIME) {
      s.status = 'lost'
      s.reason = 'time'
    }
  }
}

export function simulate(level: Level, line: Vec[]): SimState {
  const w = new World(level, line)
  while (w.state.status === 'running') w.step()
  return w.state
}

// ---------- Strich-Regeln ----------

export function lineLength(pts: Vec[]): number {
  let l = 0
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
  return l
}

function segIntersectsRect(a: Vec, b: Vec, r: Rect, pad: number): boolean {
  const x1 = r.x - pad
  const y1 = r.y - pad
  const x2 = r.x + r.w + pad
  const y2 = r.y + r.h + pad
  // Liang-Barsky
  let t0 = 0
  let t1 = 1
  const dx = b.x - a.x
  const dy = b.y - a.y
  const p = [-dx, dx, -dy, dy]
  const q = [a.x - x1, x2 - a.x, a.y - y1, y2 - a.y]
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false
    } else {
      const t = q[i] / p[i]
      if (p[i] < 0) {
        if (t > t1) return false
        if (t > t0) t0 = t
      } else {
        if (t < t0) return false
        if (t < t1) t1 = t
      }
    }
  }
  return true
}

function distPointSeg(p: Vec, a: Vec, b: Vec): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  let u = len2 > 0 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2 : 0
  u = Math.max(0, Math.min(1, u))
  return Math.hypot(p.x - (a.x + dx * u), p.y - (a.y + dy * u))
}

export type LineProblem = 'noDraw' | 'ball' | null

/** Prüft, ob ein Strich gegen eine Regel verstößt. */
export function lineProblem(level: Level, pts: Vec[]): LineProblem {
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[i + 1] ?? a
    for (const z of level.noDraw) if (segIntersectsRect(a, b, z, LINE_HALF)) return 'noDraw'
    if (distPointSeg(level.ball, a, b) < BALL_R + LINE_HALF + 3) return 'ball'
  }
  return null
}

/** Verteilt Punkte gleichmäßig (wie beim Zeichnen) und kürzt auf die Tinte. */
export function resampleLine(pts: Vec[], ink: number, spacing = POINT_SPACING): Vec[] {
  if (pts.length === 0) return []
  const out: Vec[] = [{ ...pts[0] }]
  let used = 0
  let last = pts[0]
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i]
    let d = Math.hypot(p.x - last.x, p.y - last.y)
    while (d >= spacing) {
      if (used + spacing > ink) return out
      const k = spacing / d
      last = { x: last.x + (p.x - last.x) * k, y: last.y + (p.y - last.y) * k }
      out.push(last)
      used += spacing
      d = Math.hypot(p.x - last.x, p.y - last.y)
    }
  }
  return out
}
