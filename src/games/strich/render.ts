import { BALL_R, CUP_WALL, LINE_HALF, cupWalls, type Level, type Vec } from './engine.ts'

export const C = {
  board: '#0d1a5c',
  dot: 'rgba(247,238,219,0.09)',
  cream: '#f7eedb',
  creamEdge: '#cfc2a3',
  orange: '#ff7b22',
  pink: '#ff4f93',
  lime: '#c4f23a',
  ink: '#0c1650',
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
  size: number
  rot: number
}

export interface DrawState {
  t: number
  ball: Vec
  angle: number
  hanging: boolean
  line: Vec[]
  lineInvalid: boolean
  ghost: Vec[] | null
  ghostIsHint?: boolean
  bounceAge: number
  won: boolean
  particles: Particle[]
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function strokePath(ctx: CanvasRenderingContext2D, pts: Vec[]) {
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
  if (pts.length === 1) ctx.lineTo(pts[0].x + 0.1, pts[0].y)
  ctx.stroke()
}

export function drawBoard(ctx: CanvasRenderingContext2D, L: Level, s: DrawState) {
  // Hintergrund mit Punktraster
  ctx.fillStyle = C.board
  ctx.fillRect(0, 0, L.width, L.height)
  ctx.fillStyle = C.dot
  for (let x = 12; x < L.width; x += 24) for (let y = 12; y < L.height; y += 24) ctx.fillRect(x - 1, y - 1, 2, 2)

  // Sperrzonen
  for (const z of L.noDraw) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(z.x, z.y, z.w, z.h)
    ctx.clip()
    ctx.fillStyle = 'rgba(255,123,34,0.07)'
    ctx.fillRect(z.x, z.y, z.w, z.h)
    ctx.strokeStyle = 'rgba(255,123,34,0.32)'
    ctx.lineWidth = 6
    for (let k = -z.h; k < z.w + z.h; k += 20) {
      ctx.beginPath()
      ctx.moveTo(z.x + k, z.y)
      ctx.lineTo(z.x + k - z.h, z.y + z.h)
      ctx.stroke()
    }
    ctx.restore()
    ctx.setLineDash([8, 6])
    ctx.strokeStyle = 'rgba(255,123,34,0.8)'
    ctx.lineWidth = 2
    ctx.strokeRect(z.x + 1, z.y + 1, z.w - 2, z.h - 2)
    ctx.setLineDash([])
    ctx.fillStyle = C.orange
    ctx.font = '700 12px "Bricolage Grotesque Variable", sans-serif'
    ctx.fillText('SPERRZONE · KEINE TINTE', z.x + 10, z.y + 18)
  }

  // Wind
  for (const w of L.winds) {
    ctx.fillStyle = 'rgba(247,238,219,0.05)'
    ctx.fillRect(w.x, w.y, w.w, w.h)
    const dir = Math.sign(w.fx) || 1
    ctx.strokeStyle = 'rgba(247,238,219,0.38)'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    for (let i = 0; i < 14; i++) {
      const row = w.y + 12 + ((i * 37) % (w.h - 20))
      const speed = 160 + ((i * 53) % 90)
      const len = 26 + ((i * 17) % 30)
      let x = (i * 71 + dir * s.t * speed) % (w.w + 80)
      if (x < 0) x += w.w + 80
      const px = w.x + x - 40
      ctx.beginPath()
      ctx.moveTo(px, row)
      ctx.lineTo(px - dir * len, row)
      ctx.stroke()
    }
    // Pfeile
    ctx.fillStyle = 'rgba(247,238,219,0.55)'
    for (let k = 0; k < 3; k++) {
      const ax = w.x + w.w * (0.25 + k * 0.25)
      const ay = w.y + w.h / 2
      ctx.beginPath()
      ctx.moveTo(ax + dir * 10, ay)
      ctx.lineTo(ax - dir * 6, ay - 9)
      ctx.lineTo(ax - dir * 6, ay + 9)
      ctx.closePath()
      ctx.fill()
    }
  }

  // Becher (Ziel)
  const g = L.goal
  const glow = s.won ? 0.4 : 0.12 + 0.05 * Math.sin(s.t * 3)
  ctx.fillStyle = `rgba(196,242,58,${glow})`
  ctx.fillRect(g.x, g.y, g.w, g.h)
  ctx.fillStyle = C.lime
  for (const w of cupWalls(g)) {
    roundRect(ctx, w.x, w.y, w.w, w.h, 3)
    ctx.fill()
  }
  // Fähnchen
  const fx = g.x + g.w + CUP_WALL / 2
  ctx.strokeStyle = C.lime
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(fx, g.y)
  ctx.lineTo(fx, g.y - 30)
  ctx.stroke()
  ctx.fillStyle = C.pink
  const wave = Math.sin(s.t * 5) * 2
  ctx.beginPath()
  ctx.moveTo(fx, g.y - 30)
  ctx.lineTo(fx - 20, g.y - 24 + wave)
  ctx.lineTo(fx, g.y - 17)
  ctx.closePath()
  ctx.fill()

  // Wände (Papierblöcke)
  for (const w of L.walls) {
    ctx.fillStyle = C.creamEdge
    roundRect(ctx, w.x, w.y + 3, w.w, w.h, 4)
    ctx.fill()
    ctx.fillStyle = C.cream
    roundRect(ctx, w.x, w.y, w.w, w.h - 3, 4)
    ctx.fill()
  }

  // Stacheln
  for (const sp of L.spikes) {
    ctx.fillStyle = '#5a1640'
    ctx.fillRect(sp.x, sp.y + sp.h - 6, sp.w, 6)
    ctx.fillStyle = C.pink
    const n = Math.max(1, Math.round(sp.w / 12))
    const tw = sp.w / n
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      ctx.moveTo(sp.x + i * tw, sp.y + sp.h - 4)
      ctx.lineTo(sp.x + i * tw + tw / 2, sp.y)
      ctx.lineTo(sp.x + (i + 1) * tw, sp.y + sp.h - 4)
    }
    ctx.fill()
  }

  // Trampolin
  for (const b of L.bouncers) {
    const squash = s.bounceAge < 0.25 ? Math.sin((s.bounceAge / 0.25) * Math.PI) * 6 : 0
    const mx = (b.a.x + b.b.x) / 2
    const baseY = Math.max(b.a.y, b.b.y) + 22
    ctx.strokeStyle = C.cream
    ctx.lineWidth = 2.5
    // Federn
    for (const t of [0.2, 0.8]) {
      const px = b.a.x + (b.b.x - b.a.x) * t
      const py = b.a.y + (b.b.y - b.a.y) * t + squash
      ctx.beginPath()
      ctx.moveTo(px, py)
      const steps = 6
      for (let k = 1; k <= steps; k++) ctx.lineTo(px + (k % 2 ? 6 : -6), py + ((baseY - py) * k) / steps)
      ctx.stroke()
    }
    ctx.fillStyle = C.cream
    ctx.fillRect(mx - 46, baseY, 92, 5)
    ctx.strokeStyle = C.lime
    ctx.lineWidth = 9
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(b.a.x, b.a.y + squash)
    ctx.lineTo(b.b.x, b.b.y + squash)
    ctx.stroke()
  }

  // Stifte
  for (const p of L.pegs) {
    ctx.fillStyle = C.cream
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = C.orange
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r * 0.35, 0, Math.PI * 2)
    ctx.fill()
  }

  // Fallrichtung andeuten
  if (s.hanging) {
    ctx.setLineDash([3, 9])
    ctx.strokeStyle = 'rgba(247,238,219,0.28)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(L.ball.x, L.ball.y + BALL_R + 6)
    ctx.lineTo(L.ball.x, L.height)
    ctx.stroke()
    ctx.setLineDash([])
    // Halteklammer
    ctx.strokeStyle = C.cream
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(L.ball.x, 0)
    ctx.lineTo(L.ball.x, L.ball.y - BALL_R - 6)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(L.ball.x, L.ball.y, BALL_R + 4, Math.PI * 1.15, Math.PI * 1.85)
    ctx.stroke()
  }

  // Geist des letzten Versuchs
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (s.ghost && s.ghost.length > 1) {
    ctx.setLineDash(s.ghostIsHint ? [2, 9] : [6, 8])
    ctx.strokeStyle = s.ghostIsHint ? 'rgba(196,242,58,0.75)' : 'rgba(247,238,219,0.28)'
    ctx.lineWidth = s.ghostIsHint ? 4 : 3
    strokePath(ctx, s.ghost)
    ctx.setLineDash([])
  }

  // Der Strich
  if (s.line.length > 0) {
    ctx.strokeStyle = s.lineInvalid ? C.pink : C.cream
    ctx.lineWidth = LINE_HALF * 2
    if (s.lineInvalid) ctx.setLineDash([10, 6])
    strokePath(ctx, s.line)
    ctx.setLineDash([])
  }

  // Kugel
  ctx.save()
  ctx.translate(s.ball.x, s.ball.y)
  ctx.rotate(s.angle)
  ctx.fillStyle = C.orange
  ctx.beginPath()
  ctx.arc(0, 0, BALL_R, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = C.ink
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(0, 0, BALL_R * 0.55, -0.6, 0.6)
  ctx.stroke()
  ctx.restore()
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.beginPath()
  ctx.arc(s.ball.x - 4, s.ball.y - 4, 3.2, 0, Math.PI * 2)
  ctx.fill()

  // Konfetti
  for (const p of s.particles) {
    ctx.save()
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life))
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rot)
    ctx.fillStyle = p.color
    ctx.fillRect(-p.size / 2, -p.size / 3, p.size, (p.size * 2) / 3)
    ctx.restore()
  }
}
