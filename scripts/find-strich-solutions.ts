// Sucht für jedes Level robuste Ein-Strich-Lösungen (Entwicklerwerkzeug).
// Aufruf: node --experimental-strip-types scripts/find-strich-solutions.ts [levelId]
import { lineProblem, resampleLine, simulate, lineLength, World, type HitEvent, type Level, type Vec } from '../src/games/strich/engine.ts'
import { LEVELS, HERO_LEVEL } from '../src/games/strich/levels.ts'

let seed = 12345
function rnd() {
  seed = (seed * 1664525 + 1013904223) >>> 0
  return seed / 4294967296
}

function bezier(c: Vec[], n = 40): Vec[] {
  const out: Vec[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    if (c.length === 3) {
      const u = 1 - t
      out.push({ x: u * u * c[0].x + 2 * u * t * c[1].x + t * t * c[2].x, y: u * u * c[0].y + 2 * u * t * c[1].y + t * t * c[2].y })
    } else {
      const u = 1 - t
      out.push({
        x: u * u * u * c[0].x + 3 * u * u * t * c[1].x + 3 * u * t * t * c[2].x + t * t * t * c[3].x,
        y: u * u * u * c[0].y + 3 * u * u * t * c[1].y + 3 * u * t * t * c[2].y + t * t * t * c[3].y,
      })
    }
  }
  return out
}

/** So wird eine Lösung gespeichert: ~alle 18px ein Punkt, gerundet. */
function compact(pts: Vec[]): Vec[] {
  const out: Vec[] = [pts[0]]
  let acc = 0
  for (let i = 1; i < pts.length; i++) {
    acc += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
    if (acc >= 18 || i === pts.length - 1) {
      out.push(pts[i])
      acc = 0
    }
  }
  return out.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }))
}

function wins(level: Level, ctrl: Vec[]): boolean {
  const line = resampleLine(bezier(ctrl), level.ink)
  if (lineLength(line) < 30 || lineProblem(level, line)) return false
  const w = new World(level, line)
  const hits: HitEvent[] = []
  while (w.state.status === 'running') w.step(hits)
  if (w.state.status !== 'won') return false
  // Wenn es ein Trampolin gibt, muss die Lösung es auch benutzen.
  if (level.bouncers.length && !hits.some((h) => h.kind === 'bouncer')) {
    cheats++
    if (cheats < 3) console.log('  ohne Trampolin: ' + JSON.stringify(ctrl.map((p) => [Math.round(p.x), Math.round(p.y)])))
    return false
  }
  return true
}
let cheats = 0

function robustness(level: Level, ctrl: Vec[], trials = 30, amp = 9): number {
  let ok = 0
  for (let t = 0; t < trials; t++) {
    const c = ctrl.map((p) => ({ x: p.x + (rnd() * 2 - 1) * amp, y: p.y + (rnd() * 2 - 1) * amp }))
    if (wins(level, c)) ok++
  }
  return ok / trials
}

function search(level: Level, tries: number) {
  const found: { ctrl: Vec[]; rob: number }[] = []
  for (let i = 0; i < tries; i++) {
    // „natürliche“ Striche: beginnen knapp unter der Kugel, leicht gebogen
    const p0 = { x: level.ball.x + (rnd() * 2 - 1) * 50, y: level.ball.y + 24 + rnd() * 70 }
    const p2 = { x: rnd() * level.width, y: rnd() * level.height }
    const p1 = { x: (p0.x + p2.x) / 2 + (rnd() * 2 - 1) * 90, y: (p0.y + p2.y) / 2 + (rnd() * 2 - 1) * 90 }
    const ctrl: Vec[] = [p0, p1, p2]
    if (!wins(level, ctrl)) continue
    found.push({ ctrl, rob: robustness(level, ctrl) })
  }
  found.sort((a, b) => b.rob - a.rob)
  return found
}

const only = process.argv[2]
const all = [...LEVELS, HERO_LEVEL].filter((l) => !only || l.id === only)
for (const level of all) {
  const noLine = simulate(level, []).status
  const found = search(level, Number(process.argv[3] ?? 6000))
  console.log(`\n== ${level.id}: ohne Strich -> ${noLine}; Lösungen: ${found.length}; ohne Trampolin gewonnen: ${cheats}`)
  cheats = 0
  for (const f of found.slice(0, 3)) {
    const sol = compact(resampleLine(bezier(f.ctrl), level.ink))
    const verify = simulate(level, resampleLine(sol, level.ink)).status
    console.log(`  robust ${(f.rob * 100).toFixed(0)}%  verify=${verify}  ctrl=${JSON.stringify(f.ctrl.map((p) => [Math.round(p.x), Math.round(p.y)]))}`)
    console.log('  solution: ' + JSON.stringify(sol).replace(/"/g, ''))
  }
}
