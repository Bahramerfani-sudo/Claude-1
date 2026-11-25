// Rastert die Schattenrisse (orthografische Projektion entlang der Lichtachse)
// eines Gegenstands – für den Fairness-Test im Schattenlabor.
import * as THREE from 'three'

export function project(group: THREE.Group, q: THREE.Quaternion): Float32Array {
  group.quaternion.copy(q)
  group.updateMatrixWorld(true)
  const out: number[] = []
  const v = new THREE.Vector3()
  group.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    const pos = mesh.geometry.getAttribute('position')
    const index = mesh.geometry.getIndex()
    const count = index ? index.count : pos.count
    for (let i = 0; i < count; i++) {
      const k = index ? index.getX(i) : i
      v.fromBufferAttribute(pos, k).applyMatrix4(mesh.matrixWorld)
      out.push(v.x, v.y)
    }
  })
  return new Float32Array(out)
}

function raster(tris: Float32Array, N: number, half: number, cx: number, cy: number, s: number): Uint8Array {
  const img = new Uint8Array(N * N)
  const k = N / (2 * half)
  const P = new Float32Array(tris.length)
  for (let i = 0; i < tris.length; i += 2) {
    P[i] = ((tris[i] - cx) * s + half) * k
    P[i + 1] = ((tris[i + 1] - cy) * s + half) * k
  }
  for (let t = 0; t < P.length; t += 6) {
    const x0 = P[t], y0 = P[t + 1], x1 = P[t + 2], y1 = P[t + 3], x2 = P[t + 4], y2 = P[t + 5]
    const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0)
    if (Math.abs(area) < 1e-9) continue
    const sign = area > 0 ? 1 : -1
    const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2)))
    const maxX = Math.min(N - 1, Math.ceil(Math.max(x0, x1, x2)))
    const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2)))
    const maxY = Math.min(N - 1, Math.ceil(Math.max(y0, y1, y2)))
    for (let py = minY; py <= maxY; py++) {
      const yy = py + 0.5
      for (let px = minX; px <= maxX; px++) {
        const xx = px + 0.5
        const w0 = ((x1 - x0) * (yy - y0) - (xx - x0) * (y1 - y0)) * sign
        const w1 = ((x2 - x1) * (yy - y1) - (xx - x1) * (y2 - y1)) * sign
        const w2 = ((x0 - x2) * (yy - y2) - (xx - x2) * (y0 - y2)) * sign
        if (w0 >= 0 && w1 >= 0 && w2 >= 0) img[py * N + px] = 1
      }
    }
  }
  return img
}

const REF_AREA = 1.1
const HALF = 1.7

/** Schattenriss, verschoben auf den Schwerpunkt und auf gleiche Fläche skaliert. */
export function normalizedSilhouette(group: THREE.Group, q: THREE.Quaternion, N = 72): Uint8Array {
  const tris = project(group, q)
  const coarseN = 56
  const coarse = raster(tris, coarseN, 1.05, 0, 0, 1)
  let n = 0
  let sx = 0
  let sy = 0
  const cell = 2.1 / coarseN
  for (let y = 0; y < coarseN; y++)
    for (let x = 0; x < coarseN; x++)
      if (coarse[y * coarseN + x]) {
        n++
        sx += (x + 0.5) * cell - 1.05
        sy += (y + 0.5) * cell - 1.05
      }
  if (!n) return new Uint8Array(N * N)
  const area = n * cell * cell
  return raster(tris, N, HALF, sx / n, sy / n, Math.sqrt(REF_AREA / area))
}

export function iou(a: Uint8Array, b: Uint8Array): number {
  let inter = 0
  let uni = 0
  for (let i = 0; i < a.length; i++) {
    if (a[i] && b[i]) inter++
    if (a[i] || b[i]) uni++
  }
  return uni ? inter / uni : 0
}

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
}

function randomQuat(r: () => number): THREE.Quaternion {
  const u1 = r()
  const u2 = r() * Math.PI * 2
  const u3 = r() * Math.PI * 2
  const a = Math.sqrt(1 - u1)
  const b = Math.sqrt(u1)
  return new THREE.Quaternion(a * Math.sin(u2), a * Math.cos(u2), b * Math.sin(u3), b * Math.cos(u3))
}

/** Bestmögliche Übereinstimmung eines Gegenstands mit dem Ziel-Schatten über alle Drehungen. */
export function bestMatch(group: THREE.Group, target: Uint8Array, samples = 2500, seed = 7): { iou: number; q: THREE.Quaternion } {
  const r = rng(seed)
  const scored: { iou: number; q: THREE.Quaternion }[] = []
  const small = target48(target)
  for (let i = 0; i < samples; i++) {
    const q = randomQuat(r)
    scored.push({ iou: iou(normalizedSilhouette(group, q, 48), small), q })
  }
  scored.sort((a, b) => b.iou - a.iou)
  let best = { iou: 0, q: new THREE.Quaternion() }
  for (const start of scored.slice(0, 12)) {
    let q = start.q.clone()
    let cur = iou(normalizedSilhouette(group, q), target)
    let step = 0.3
    for (let it = 0; it < 160; it++) {
      const axis = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize()
      const dq = new THREE.Quaternion().setFromAxisAngle(axis, step * (r() * 2 - 1))
      const q2 = dq.multiply(q.clone())
      const v = iou(normalizedSilhouette(group, q2), target)
      if (v > cur) {
        cur = v
        q = q2
      } else step = Math.max(0.015, step * 0.97)
    }
    if (cur > best.iou) best = { iou: cur, q }
  }
  return best
}

const cache = new WeakMap<Uint8Array, Uint8Array>()
/** Ziel-Schatten auf 48×48 heruntergerechnet (für die grobe Suche). */
function target48(t: Uint8Array): Uint8Array {
  const hit = cache.get(t)
  if (hit) return hit
  const N = Math.round(Math.sqrt(t.length))
  const out = new Uint8Array(48 * 48)
  for (let y = 0; y < 48; y++)
    for (let x = 0; x < 48; x++) {
      const sx = Math.min(N - 1, Math.floor(((x + 0.5) / 48) * N))
      const sy = Math.min(N - 1, Math.floor(((y + 0.5) / 48) * N))
      out[y * 48 + x] = t[sy * N + sx]
    }
  cache.set(t, out)
  return out
}

export function ascii(img: Uint8Array): string {
  const N = Math.round(Math.sqrt(img.length))
  const rows: string[] = []
  for (let y = N - 1; y >= 0; y -= 2) {
    let s = ''
    for (let x = 0; x < N; x++) s += img[y * N + x] ? '#' : '.'
    rows.push(s)
  }
  return rows.join('\n')
}
