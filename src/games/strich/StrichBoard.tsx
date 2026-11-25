import { useEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from 'react'
import {
  DT,
  MIN_LINE,
  POINT_SPACING,
  World,
  lineProblem,
  resampleLine,
  type HitEvent,
  type Level,
  type LineProblem,
  type LoseReason,
  type Vec,
} from './engine.ts'
import { C, drawBoard, type Particle } from './render.ts'
import { sfx, unlockAudio } from '../../lib/sound'

export type BoardPhase = 'ready' | 'drawing' | 'falling' | 'won' | 'lost'

export interface BoardEvent {
  phase: BoardPhase
  attempts: number
  reason?: LoseReason
}

const LOSE_TEXT: Record<LoseReason, string> = {
  spikes: 'Autsch, Stacheln! Zeichne einfach eine neue Linie.',
  out: 'Die Kugel ist aus dem Bild gerollt. Neuer Strich?',
  stuck: 'Die Kugel bleibt liegen. Probier es steiler.',
  time: 'Das dauert zu lange. Probier eine andere Linie.',
}

const PROBLEM_TEXT: Record<Exclude<LineProblem, null>, string> = {
  noDraw: 'In der gestreiften Sperrzone hält keine Tinte. Zeichne außerhalb.',
  ball: 'Nicht durch die Kugel zeichnen, lieber darunter.',
}

interface Props {
  level: Level
  onEvent?: (e: BoardEvent) => void
  /** Wert ändern = alles zurücksetzen (auch Geisterlinie) */
  resetKey?: number
  showHint?: boolean
  compact?: boolean
  readyText?: string
  ariaLabel: string
  children?: ReactNode
}

interface Core {
  phase: BoardPhase
  line: Vec[]
  ink: number
  invalid: LineProblem
  ghost: Vec[] | null
  world: World | null
  acc: number
  t: number
  bounceAt: number
  endAt: number
  particles: Particle[]
  attempts: number
  pointerId: number | null
  visible: boolean
}

export function StrichBoard({ level, onEvent, resetKey = 0, showHint = false, compact = false, readyText, ariaLabel, children }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const inkRef = useRef<HTMLDivElement>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent
  const hintRef = useRef<Vec[] | null>(null)
  hintRef.current = showHint ? resampleLine(level.solution, level.ink) : null

  const [message, setMessage] = useState<string | null>(null)

  const core = useRef<Core>({
    phase: 'ready',
    line: [],
    ink: 0,
    invalid: null,
    ghost: null,
    world: null,
    acc: 0,
    t: 0,
    bounceAt: -10,
    endAt: 0,
    particles: [],
    attempts: 0,
    pointerId: null,
    visible: true,
  })

  const updateInk = () => {
    const el = inkRef.current
    if (el) el.style.transform = `scaleX(${Math.max(0, 1 - core.current.ink / level.ink)})`
  }

  // Zurücksetzen von außen
  useEffect(() => {
    const c = core.current
    c.phase = 'ready'
    c.line = []
    c.ink = 0
    c.invalid = null
    c.ghost = null
    c.world = null
    c.particles = []
    c.attempts = 0
    setMessage(null)
    updateInk()
  }, [resetKey, level])

  // Zeichenfläche an Größe anpassen
  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const resize = () => {
      const r = wrap.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
      canvas.width = Math.max(1, Math.round(r.width * dpr))
      canvas.height = Math.max(1, Math.round(r.height * dpr))
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)
    const io = new IntersectionObserver((entries) => {
      core.current.visible = entries[0]?.isIntersecting ?? true
    })
    io.observe(wrap)
    return () => {
      ro.disconnect()
      io.disconnect()
    }
  }, [])

  // Spiel- und Zeichenschleife
  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let raf = 0
    let last = performance.now()
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const c = core.current
      c.t += dt

      if (c.phase === 'falling' && c.world) {
        c.acc += dt
        const hits: HitEvent[] = []
        while (c.acc >= DT && c.world.state.status === 'running') {
          c.world.step(hits)
          c.acc -= DT
        }
        if (hits.length) {
          const strongest = hits.reduce((a, b) => (b.speed > a.speed ? b : a))
          if (hits.some((h) => h.kind === 'bouncer')) {
            c.bounceAt = c.t
            sfx('spring')
          } else sfx('plink', strongest.speed / 700)
        }
        const st = c.world.state
        if (st.status === 'won') {
          c.phase = 'won'
          c.endAt = c.t
          const colors = [C.orange, C.pink, C.lime, C.cream]
          for (let i = 0; i < 60; i++) {
            const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2
            const sp = 180 + Math.random() * 320
            c.particles.push({
              x: level.goal.x + level.goal.w / 2,
              y: level.goal.y + 6,
              vx: Math.cos(a) * sp,
              vy: Math.sin(a) * sp,
              life: 1.4 + Math.random() * 0.8,
              color: colors[i % colors.length],
              size: 6 + Math.random() * 6,
              rot: Math.random() * 6,
            })
          }
          sfx('win')
          setMessage(null)
          onEventRef.current?.({ phase: 'won', attempts: c.attempts })
        } else if (st.status === 'lost') {
          c.phase = 'lost'
          c.endAt = c.t
          sfx('lose')
          setMessage(LOSE_TEXT[st.reason ?? 'out'])
          onEventRef.current?.({ phase: 'lost', attempts: c.attempts, reason: st.reason })
        }
      }

      if (c.particles.length) {
        for (const p of c.particles) {
          p.vy += 600 * dt
          p.vx *= 0.99
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.rot += dt * 8
          p.life -= dt
        }
        c.particles = c.particles.filter((p) => p.life > 0)
      }

      if (!c.visible) return
      const scale = canvas.width / level.width
      ctx.setTransform(scale, 0, 0, scale, 0, 0)

      const st = c.world?.state
      const showWorldBall = st && (c.phase === 'falling' || c.phase === 'won' || (c.phase === 'lost' && c.t - c.endAt < 0.7))
      drawBoard(ctx, level, {
        t: c.t,
        ball: showWorldBall ? { x: st.x, y: st.y } : level.ball,
        angle: showWorldBall ? st.angle : Math.sin(c.t * 2) * 0.15,
        hanging: !showWorldBall,
        line: c.line,
        lineInvalid: c.phase === 'drawing' && c.invalid !== null,
        ghost: hintRef.current ?? c.ghost,
        ghostIsHint: hintRef.current !== null,
        bounceAge: c.t - c.bounceAt,
        won: c.phase === 'won',
        particles: c.particles,
      })
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [level])

  const toWorld = (e: { clientX: number; clientY: number }): Vec => {
    const r = canvasRef.current!.getBoundingClientRect()
    return {
      x: ((e.clientX - r.left) / r.width) * level.width,
      y: ((e.clientY - r.top) / r.height) * level.height,
    }
  }

  const finish = (inkOut = false) => {
    const c = core.current
    c.pointerId = null
    if (c.ink < MIN_LINE) {
      c.line = []
      c.phase = 'ready'
      setMessage('Halte gedrückt und zieh eine Linie.')
      return
    }
    if (c.invalid) {
      setMessage(PROBLEM_TEXT[c.invalid])
      wrapRef.current?.animate(
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-8px)' },
          { transform: 'translateX(7px)' },
          { transform: 'translateX(-4px)' },
          { transform: 'translateX(0)' },
        ],
        { duration: 360, easing: 'ease-out' },
      )
      sfx('lose')
      c.line = []
      c.ink = 0
      c.phase = 'ready'
      updateInk()
      return
    }
    c.phase = 'falling'
    c.world = new World(level, c.line)
    c.acc = 0
    c.attempts++
    setMessage(inkOut ? 'Tinte alle – und los!' : null)
    onEventRef.current?.({ phase: 'falling', attempts: c.attempts })
  }

  const addPoint = (p: Vec) => {
    const c = core.current
    let lastP = c.line[c.line.length - 1]
    let d = Math.hypot(p.x - lastP.x, p.y - lastP.y)
    while (d >= POINT_SPACING) {
      if (c.ink + POINT_SPACING > level.ink) {
        updateInk()
        finish(true)
        return false
      }
      const k = POINT_SPACING / d
      const next = { x: lastP.x + (p.x - lastP.x) * k, y: lastP.y + (p.y - lastP.y) * k }
      c.line.push(next)
      c.ink += POINT_SPACING
      if (!c.invalid) c.invalid = lineProblem(level, [lastP, next])
      lastP = next
      d = Math.hypot(p.x - lastP.x, p.y - lastP.y)
    }
    return true
  }

  const onPointerDown = (e: RPointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    unlockAudio()
    const c = core.current
    if (c.phase === 'drawing') return
    e.preventDefault()
    if (c.phase === 'falling' || c.phase === 'won' || c.phase === 'lost') {
      if (c.line.length > 1) c.ghost = c.line
      c.world = null
      c.particles = []
    }
    const p = toWorld(e)
    c.phase = 'drawing'
    c.line = [p]
    c.ink = 0
    c.invalid = lineProblem(level, [p])
    c.pointerId = e.pointerId
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* ältere Browser */
    }
    setMessage(null)
    updateInk()
    onEventRef.current?.({ phase: 'drawing', attempts: c.attempts })
  }

  const onPointerMove = (e: RPointerEvent<HTMLCanvasElement>) => {
    const c = core.current
    if (c.phase !== 'drawing' || e.pointerId !== c.pointerId) return
    const native = e.nativeEvent
    const evs = typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : [native]
    for (const ev of evs.length ? evs : [native]) {
      if (!addPoint(toWorld(ev))) break
    }
    updateInk()
  }

  const onPointerUp = (e: RPointerEvent<HTMLCanvasElement>) => {
    const c = core.current
    if (c.phase === 'drawing' && e.pointerId === c.pointerId) finish()
  }

  return (
    <div className={`strich-board${compact ? ' is-compact' : ''}`}>
      <div
        ref={wrapRef}
        className="board-canvas-wrap"
        style={{ aspectRatio: `${level.width} / ${level.height}` }}
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={ariaLabel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onContextMenu={(e) => e.preventDefault()}
        />
        {children}
      </div>
      <div className="board-hud">
        <div className="ink" aria-hidden="true">
          <span>Tinte</span>
          <div className="ink-track">
            <div className="ink-fill" ref={inkRef} />
          </div>
        </div>
        <p className="board-msg" aria-live="polite">
          {message ?? readyText ?? ''}
        </p>
      </div>
    </div>
  )
}
