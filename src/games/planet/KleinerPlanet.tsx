import { useCallback, useEffect, useRef, useState, type MouseEvent as RMouseEvent, type PointerEvent as RPointerEvent } from 'react'
import { GameShell } from '../../components/GameShell'
import { IconArrow, IconCheck } from '../../components/Icons'
import { createThruster, sfx, unlockAudio } from '../../lib/sound'
import { useStored } from '../../lib/storage'
import {
  DT,
  MAX_SPEED,
  MAX_TILT,
  MISSIONS,
  MOON_R,
  altitude,
  judge,
  lostInSpace,
  predict,
  startState,
  step,
  telemetry,
  touchesGround,
  type Input,
  type Outcome,
} from './physics.ts'
import './planet.css'

type Phase = 'ready' | 'flying' | 'done'
type Key = keyof Input

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
  size: number
}

const C = {
  space: '#0a1548',
  cream: '#f7eedb',
  crater: '#e6d6b2',
  orange: '#ff7b22',
  pink: '#ff4f93',
  lime: '#c4f23a',
  ink: '#0c1650',
}

const nf1 = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

// feste Krater (Winkel, Abstand vom Mittelpunkt, Radius)
const CRATERS: [number, number, number][] = [
  [0.6, 32, 9],
  [2.2, 38, 7],
  [3.6, 24, 12],
  [4.6, 40, 6],
  [5.4, 18, 8],
  [1.4, 12, 5],
  [2.9, 46, 5],
]

const STARS = Array.from({ length: 110 }, (_, i) => ({
  x: (Math.sin(i * 127.1) * 43758.5453) % 1,
  y: (Math.sin(i * 311.7) * 12543.1234) % 1,
  r: i % 7 === 0 ? 1.6 : 0.9,
  p: i * 0.7,
}))

function PadIcon({ dir }: { dir: 'left' | 'right' | 'up' }) {
  if (dir === 'up')
    return (
      <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
        <path d="M12 3 L19 13 H14.5 V21 H9.5 V13 H5 Z" fill="currentColor" />
      </svg>
    )
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true" style={dir === 'right' ? { transform: 'scaleX(-1)' } : undefined}>
      <path d="M4 12a8 8 0 1 0 2.4-5.7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M2.6 3.2 L3.4 10 L10 8.8 Z" fill="currentColor" />
    </svg>
  )
}

export default function KleinerPlanet() {
  const [best, setBest] = useStored<Record<string, number>>('planet:missions', {})
  const [mi, setMi] = useState(() => {
    const i = MISSIONS.findIndex((m) => !(m.id in best))
    return i === -1 ? 0 : i
  })
  const [phase, setPhase] = useState<Phase>('ready')
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [newBest, setNewBest] = useState(false)
  const bestRef = useRef(best)
  bestRef.current = best
  const [pressed, setPressed] = useState<Record<Key, boolean>>({ left: false, right: false, thrust: false })
  const mission = MISSIONS[mi]

  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hud = {
    fuel: useRef<HTMLDivElement>(null),
    fuelText: useRef<HTMLSpanElement>(null),
    speed: useRef<HTMLSpanElement>(null),
    tilt: useRef<HTMLSpanElement>(null),
    alt: useRef<HTMLSpanElement>(null),
  }
  const sim = useRef({
    ship: startState(MISSIONS[mi]),
    input: { left: false, right: false, thrust: false } as Input,
    keys: { left: false, right: false, thrust: false } as Input,
    pads: { left: new Set<number>(), right: new Set<number>(), thrust: new Set<number>() },
    phase: 'ready' as Phase,
    acc: 0,
    viewR: 175,
    particles: [] as Particle[],
    crashed: false,
    t: 0,
  })
  const thruster = useRef(createThruster())
  const missionRef = useRef(mission)
  missionRef.current = mission

  const reset = useCallback((index: number) => {
    const s = sim.current
    s.ship = startState(MISSIONS[index])
    s.phase = 'ready'
    s.acc = 0
    s.particles = []
    s.crashed = false
    s.viewR = 175
    setPhase('ready')
    setOutcome(null)
  }, [])

  const begin = useCallback(() => {
    unlockAudio()
    const s = sim.current
    if (s.phase === 'ready') {
      s.phase = 'flying'
      setPhase('flying')
    }
  }, [])

  const restart = useCallback(() => {
    reset(mi)
    begin()
  }, [mi, reset, begin])

  const goMission = (i: number) => {
    setMi(i)
    reset(i)
  }

  const syncInput = () => {
    const s = sim.current
    const next: Input = {
      left: s.keys.left || s.pads.left.size > 0,
      right: s.keys.right || s.pads.right.size > 0,
      thrust: s.keys.thrust || s.pads.thrust.size > 0,
    }
    s.input = next
    setPressed((p) => (p.left === next.left && p.right === next.right && p.thrust === next.thrust ? p : next))
  }

  // Tastatur
  useEffect(() => {
    const map: Record<string, Key> = {
      ArrowLeft: 'left',
      KeyA: 'left',
      ArrowRight: 'right',
      KeyD: 'right',
      ArrowUp: 'thrust',
      KeyW: 'thrust',
      Space: 'thrust',
    }
    const down = (e: KeyboardEvent) => {
      const s = sim.current
      if (e.code === 'KeyR') {
        e.preventDefault()
        restart()
        return
      }
      const k = map[e.code]
      if (!k) return
      e.preventDefault()
      if (s.phase === 'done') return
      if (s.phase === 'ready') begin()
      s.keys[k] = true
      syncInput()
    }
    const up = (e: KeyboardEvent) => {
      const k = map[e.code]
      if (!k) return
      sim.current.keys[k] = false
      syncInput()
    }
    const blur = () => {
      const s = sim.current
      s.keys = { left: false, right: false, thrust: false }
      syncInput()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [restart, begin])

  // Spielschleife
  useEffect(() => {
    const canvas = canvasRef.current!
    const wrap = wrapRef.current!
    const ctx = canvas.getContext('2d')!
    const th = thruster.current
    let raf = 0
    let last = performance.now()
    let w = 0
    let h = 0
    let dpr = 1
    const resize = () => {
      const r = wrap.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2.5)
      w = r.width
      h = r.height
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const s = sim.current
      const m = missionRef.current
      s.t += dt

      if (s.phase === 'flying') {
        s.acc += dt
        while (s.acc >= DT && s.phase === 'flying') {
          s.acc -= DT
          step(s.ship, s.input)
          if (touchesGround(s.ship)) {
            const res = judge(s.ship, m)
            s.phase = 'done'
            s.crashed = !res.landed && (res.speed > MAX_SPEED || res.tilt > MAX_TILT)
            const colors = s.crashed ? [C.orange, C.pink, C.cream, C.lime] : [C.cream, C.crater]
            const n = s.crashed ? 70 : 24
            for (let i = 0; i < n; i++) {
              const ang = Math.random() * Math.PI * 2
              const sp = s.crashed ? 10 + Math.random() * 45 : 4 + Math.random() * 10
              s.particles.push({
                x: s.ship.x,
                y: s.ship.y,
                vx: Math.cos(ang) * sp + s.ship.vx * 0.2,
                vy: Math.sin(ang) * sp + s.ship.vy * 0.2,
                life: 1 + Math.random() * 1.2,
                color: colors[i % colors.length],
                size: s.crashed ? 1.2 + Math.random() * 2.4 : 1 + Math.random() * 1.5,
              })
            }
            if (!s.crashed) {
              // auf der Oberfläche zur Ruhe kommen
              s.ship.vx = 0
              s.ship.vy = 0
            }
            sfx(res.landed ? 'land' : s.crashed ? 'boom' : 'lose')
            if (res.landed) {
              const fuel = Math.round(res.fuel)
              const old = bestRef.current[m.id]
              setNewBest(old == null || fuel > old)
              setBest((b) => ({ ...b, [m.id]: Math.max(b[m.id] ?? 0, fuel) }))
            }
            setOutcome(res)
            setPhase('done')
          } else if (lostInSpace(s.ship)) {
            s.phase = 'done'
            setOutcome({
              landed: false,
              title: 'Ins All abgedriftet',
              reasons: ['Zu viel Schub weg vom Mond – die Schwerkraft holt dich nicht mehr zurück.'],
              speed: Math.hypot(s.ship.vx, s.ship.vy),
              tilt: 0,
              fuel: s.ship.fuel,
            })
            sfx('lose')
            setPhase('done')
          }
        }
      }
      th.set(s.phase === 'flying' && s.ship.thrusting)

      for (const p of s.particles) {
        const r = Math.hypot(p.x, p.y)
        p.vx += (-p.x / r) * 8 * dt
        p.vy += (-p.y / r) * 8 * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        if (Math.hypot(p.x, p.y) < MOON_R) {
          const k = MOON_R / Math.hypot(p.x, p.y)
          p.x *= k
          p.y *= k
          p.vx *= 0.3
          p.vy *= 0.3
        }
        p.life -= dt
      }
      s.particles = s.particles.filter((p) => p.life > 0)

      // HUD
      const tel = telemetry(s.ship, m)
      if (hud.fuel.current) {
        hud.fuel.current.style.transform = `scaleX(${s.ship.fuel / 100})`
        hud.fuel.current.dataset.level = s.ship.fuel > 30 ? 'ok' : s.ship.fuel > 12 ? 'low' : 'empty'
      }
      if (hud.fuelText.current) hud.fuelText.current.textContent = `${Math.round(s.ship.fuel)} %`
      if (hud.speed.current) {
        hud.speed.current.textContent = `${nf1.format(tel.speed)} m/s`
        hud.speed.current.dataset.ok = String(tel.speed <= MAX_SPEED)
      }
      if (hud.tilt.current) {
        hud.tilt.current.textContent = `${Math.round(tel.tilt)}°`
        hud.tilt.current.dataset.ok = String(tel.tilt <= MAX_TILT)
      }
      if (hud.alt.current) hud.alt.current.textContent = `${Math.round(altitude(s.ship))} m`

      // Kamera
      const rShip = Math.hypot(s.ship.x, s.ship.y)
      const target = Math.min(185, Math.max(98, rShip * 1.12 + 22))
      s.viewR += (target - s.viewR) * Math.min(1, dt * 1.5)
      const scale = (Math.min(w, h) / (2 * s.viewR)) * dpr
      const cx = (w * dpr) / 2
      const cy = (h * dpr) / 2
      const X = (x: number) => cx + x * scale
      const Y = (y: number) => cy - y * scale

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.fillStyle = C.space
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      for (const st of STARS) {
        ctx.globalAlpha = 0.45 + 0.4 * Math.sin(s.t * 1.3 + st.p)
        ctx.fillStyle = C.cream
        ctx.beginPath()
        ctx.arc(Math.abs(st.x) * canvas.width, Math.abs(st.y) * canvas.height, st.r * dpr, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // Mond
      const grad = ctx.createRadialGradient(X(-20), Y(25), MOON_R * scale * 0.2, X(0), Y(0), MOON_R * scale)
      grad.addColorStop(0, '#fbf5e6')
      grad.addColorStop(1, '#e2d1aa')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(X(0), Y(0), MOON_R * scale, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = C.crater
      for (const [a, d, r] of CRATERS) {
        ctx.beginPath()
        ctx.arc(X(Math.cos(a) * d), Y(Math.sin(a) * d), r * scale, 0, Math.PI * 2)
        ctx.fill()
      }

      // Landezone
      const z0 = m.zoneAngle - m.zoneHalf
      const z1 = m.zoneAngle + m.zoneHalf
      ctx.strokeStyle = C.lime
      ctx.lineWidth = 3.2 * scale
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.arc(X(0), Y(0), (MOON_R + 0.6) * scale, -z1, -z0)
      ctx.stroke()
      for (const za of [z0, z1]) {
        const bx = Math.cos(za) * MOON_R
        const by = Math.sin(za) * MOON_R
        const tx = Math.cos(za) * (MOON_R + 15)
        const ty = Math.sin(za) * (MOON_R + 15)
        ctx.strokeStyle = C.cream
        ctx.lineWidth = 1.2 * scale
        ctx.beginPath()
        ctx.moveTo(X(bx), Y(by))
        ctx.lineTo(X(tx), Y(ty))
        ctx.stroke()
        const side = za === z0 ? -1 : 1
        const nx = -Math.sin(za) * side
        const ny = Math.cos(za) * side
        ctx.fillStyle = C.lime
        ctx.beginPath()
        ctx.moveTo(X(tx), Y(ty))
        ctx.lineTo(X(tx + nx * 7 - Math.cos(za) * 2.5), Y(ty + ny * 7 - Math.sin(za) * 2.5))
        ctx.lineTo(X(tx - Math.cos(za) * 5), Y(ty - Math.sin(za) * 5))
        ctx.closePath()
        ctx.fill()
      }
      for (let i = 0; i < 5; i++) {
        const la = z0 + ((i + 0.5) / 5) * (z1 - z0)
        const on = Math.floor(s.t * 3 - i * 0.5) % 2 === 0
        ctx.fillStyle = on ? C.lime : 'rgba(196,242,58,0.25)'
        ctx.beginPath()
        ctx.arc(X(Math.cos(la) * (MOON_R + 3)), Y(Math.sin(la) * (MOON_R + 3)), 1.3 * scale, 0, Math.PI * 2)
        ctx.fill()
      }

      // Bahnvorschau
      if (s.phase !== 'done') {
        const pts = predict(s.ship, 2.6)
        ctx.fillStyle = 'rgba(247,238,219,0.45)'
        for (const [px, py] of pts) {
          ctx.beginPath()
          ctx.arc(X(px), Y(py), 0.8 * scale, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Schiff
      if (!s.crashed) {
        const sh = s.ship
        ctx.save()
        ctx.translate(X(sh.x), Y(sh.y))
        ctx.rotate(Math.PI / 2 - sh.a)
        ctx.scale(scale, scale)
        // jetzt: Einheiten in Metern, Spitze zeigt nach oben (negatives y auf dem Bildschirm)
        if (sh.thrusting && s.phase === 'flying') {
          const fl = 9 + Math.random() * 6
          ctx.fillStyle = C.orange
          ctx.beginPath()
          ctx.moveTo(-3.6, 5)
          ctx.lineTo(0, 5 + fl)
          ctx.lineTo(3.6, 5)
          ctx.fill()
          ctx.fillStyle = C.lime
          ctx.beginPath()
          ctx.moveTo(-1.8, 5)
          ctx.lineTo(0, 5 + fl * 0.55)
          ctx.lineTo(1.8, 5)
          ctx.fill()
        }
        ctx.strokeStyle = C.cream
        ctx.lineWidth = 1.6
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(-3.5, 2)
        ctx.lineTo(-7, 8)
        ctx.moveTo(3.5, 2)
        ctx.lineTo(7, 8)
        ctx.moveTo(-8.6, 8)
        ctx.lineTo(-5.4, 8)
        ctx.moveTo(5.4, 8)
        ctx.lineTo(8.6, 8)
        ctx.stroke()
        ctx.fillStyle = C.pink
        ctx.strokeStyle = C.ink
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(0, -9)
        ctx.bezierCurveTo(5, -7, 6, -1, 5.6, 5)
        ctx.lineTo(-5.6, 5)
        ctx.bezierCurveTo(-6, -1, -5, -7, 0, -9)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = C.cream
        ctx.beginPath()
        ctx.arc(0, -2, 2.4, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.restore()
      }

      for (const p of s.particles) {
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life))
        ctx.fillStyle = p.color
        ctx.fillRect(X(p.x) - (p.size * scale) / 2, Y(p.y) - (p.size * scale) / 2, p.size * scale, p.size * scale)
      }
      ctx.globalAlpha = 1
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      th.stop()
    }
  }, [])

  // Touch-/Maus-Steuerflächen
  const padHandlers = (k: Key) => ({
    onPointerDown: (e: RPointerEvent<HTMLButtonElement>) => {
      e.preventDefault()
      const s = sim.current
      if (s.phase === 'done') return
      if (s.phase === 'ready') begin()
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        /* egal */
      }
      s.pads[k].add(e.pointerId)
      syncInput()
    },
    onPointerUp: (e: RPointerEvent<HTMLButtonElement>) => {
      sim.current.pads[k].delete(e.pointerId)
      syncInput()
    },
    onPointerCancel: (e: RPointerEvent<HTMLButtonElement>) => {
      sim.current.pads[k].delete(e.pointerId)
      syncInput()
    },
    onLostPointerCapture: (e: RPointerEvent<HTMLButtonElement>) => {
      sim.current.pads[k].delete(e.pointerId)
      syncInput()
    },
    onContextMenu: (e: RMouseEvent) => e.preventDefault(),
  })

  const isLast = mi === MISSIONS.length - 1

  return (
    <GameShell game="planet" onRestart={restart} restartLabel="Neustart">
      <nav className="level-chips" aria-label="Mission auswählen">
        {MISSIONS.map((m, i) => {
          const done = m.id in best
          return (
            <button
              key={m.id}
              type="button"
              className={`level-chip${i === mi ? ' is-current' : ''}${done ? ' is-solved' : ''}`}
              aria-current={i === mi ? 'true' : undefined}
              onClick={() => goMission(i)}
            >
              <span className="num">{done ? <IconCheck width={16} height={16} /> : i + 1}</span>
              <span className="name">{m.name}</span>
            </button>
          )
        })}
      </nav>
      <p className="game-intro">
        <strong>
          Mission {mi + 1} · {mission.name}.
        </strong>{' '}
        {mission.hint}
      </p>

      <div className="planet-stage" ref={wrapRef}>
        <canvas ref={canvasRef} role="img" aria-label={`Raumschiff über einem kleinen Mond. Landezone grün markiert. ${mission.hint}`} />
        <div className="planet-hud" aria-hidden={phase !== 'flying'}>
          <div className="hud-fuel">
            <span className="hud-label">Treibstoff</span>
            <div className="hud-track">
              <div className="hud-fill" ref={hud.fuel} />
            </div>
            <span className="hud-val" ref={hud.fuelText}>
              100 %
            </span>
          </div>
          <div className="hud-stats">
            <span className="hud-stat">
              <span className="hud-label">Tempo</span>
              <span className="hud-val" ref={hud.speed}>
                0,0 m/s
              </span>
            </span>
            <span className="hud-stat">
              <span className="hud-label">Neigung</span>
              <span className="hud-val" ref={hud.tilt}>
                0°
              </span>
            </span>
            <span className="hud-stat">
              <span className="hud-label">Höhe</span>
              <span className="hud-val" ref={hud.alt}>
                0 m
              </span>
            </span>
          </div>
        </div>

        {phase === 'ready' && (
          <div className="planet-overlay is-ready">
            <div className="result-card planet-card pop-in">
              <h2>Bereit zur Landung?</h2>
              <p>
                Landen mit höchstens <strong>{MAX_SPEED} m/s</strong> und <strong>{MAX_TILT}°</strong> Neigung – mitten in der grünen Zone.
              </p>
              <button type="button" className="btn btn-orange btn-big" onClick={begin} autoFocus>
                Los geht’s
              </button>
              <p className="planet-keys">Tasten: ← → drehen · ↑ oder Leertaste für Schub · R für Neustart</p>
            </div>
          </div>
        )}

        {phase === 'done' && outcome && (
          <div className="planet-overlay">
            <div className={`result-card planet-card pop-in ${outcome.landed ? 'is-win' : 'is-fail'}`} role="status">
              <h2>{outcome.title}</h2>
              {outcome.landed ? (
                <p>
                  Aufgesetzt mit {nf1.format(outcome.speed)} m/s und {Math.round(outcome.tilt)}° Neigung. Noch <strong>{Math.round(outcome.fuel)} %</strong> Treibstoff übrig
                  {newBest ? ' – neuer Bestwert!' : `. Bestwert: ${best[mission.id]} %.`}
                </p>
              ) : (
                <ul className="planet-reasons">
                  {outcome.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              )}
              <div className="planet-actions">
                {outcome.landed && !isLast && (
                  <button type="button" className="btn btn-lime" onClick={() => goMission(mi + 1)} autoFocus>
                    Nächste Mission <IconArrow />
                  </button>
                )}
                {outcome.landed && isLast && (
                  <a className="btn btn-lime" href="#start">
                    Zur Übersicht <IconArrow />
                  </a>
                )}
                <button type="button" className="btn btn-orange" onClick={restart} autoFocus={!outcome.landed}>
                  Nochmal (R)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="planet-pads" role="group" aria-label="Steuerung">
        <button type="button" className={`pad pad-turn${pressed.left ? ' is-down' : ''}`} aria-label="Nach links drehen" {...padHandlers('left')}>
          <PadIcon dir="left" />
          <span className="pad-label">Links</span>
          <kbd>←</kbd>
        </button>
        <button type="button" className={`pad pad-thrust${pressed.thrust ? ' is-down' : ''}`} aria-label="Schub geben" {...padHandlers('thrust')}>
          <PadIcon dir="up" />
          <span className="pad-label">Schub</span>
          <kbd>↑</kbd>
        </button>
        <button type="button" className={`pad pad-turn${pressed.right ? ' is-down' : ''}`} aria-label="Nach rechts drehen" {...padHandlers('right')}>
          <PadIcon dir="right" />
          <span className="pad-label">Rechts</span>
          <kbd>→</kbd>
        </button>
      </div>
    </GameShell>
  )
}
