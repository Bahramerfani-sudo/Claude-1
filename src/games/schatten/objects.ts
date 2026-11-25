// Gegenstände für das Schattenlabor – aus einfachen Grundformen gebaut.
// Läuft auch in Node (für den Fairness-Test), daher keine DOM-Abhängigkeiten.
import * as THREE from 'three'

export type Detail = 'high' | 'low'

export const COL = {
  cream: '#f7eedb',
  orange: '#ff7b22',
  softOrange: '#ffa05c',
  pink: '#ff4f93',
  lime: '#c4f23a',
  metal: '#a9b6e6',
  ink: '#2a3570',
  coffee: '#6b3a1f',
  glass: '#fff3c4',
}

interface Part {
  geo: THREE.BufferGeometry
  color: string
  pos?: [number, number, number]
  rot?: [number, number, number]
  scale?: [number, number, number]
  double?: boolean
}

const placeholder = new THREE.MeshBasicMaterial()

function assemble(parts: Part[]): THREE.Group {
  const inner = new THREE.Group()
  for (const p of parts) {
    const m = new THREE.Mesh(p.geo, placeholder)
    m.userData.color = p.color
    m.userData.double = !!p.double
    if (p.pos) m.position.set(...p.pos)
    if (p.rot) m.rotation.set(...p.rot)
    if (p.scale) m.scale.set(...p.scale)
    inner.add(m)
  }
  // auf Ursprung zentrieren und auf Radius 1 normieren
  inner.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(inner)
  const center = box.getCenter(new THREE.Vector3())
  let r = 0
  const v = new THREE.Vector3()
  inner.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    const pos = mesh.geometry.getAttribute('position')
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld)
      r = Math.max(r, v.distanceTo(center))
    }
  })
  inner.position.copy(center).multiplyScalar(-1)
  const outer = new THREE.Group()
  outer.add(inner)
  outer.scale.setScalar(1 / r)
  const wrap = new THREE.Group()
  wrap.add(outer)
  return wrap
}

function lathe(points: [number, number][], seg: number) {
  return new THREE.LatheGeometry(
    points.map(([x, y]) => new THREE.Vector2(x, y)),
    seg,
  )
}

/** Fläche: unten Kreis, oben eine Kante – von vorn Quadrat, von der Seite Dreieck. */
function corkGeometry(seg: number): THREE.BufferGeometry {
  const rows = Math.max(6, Math.round(seg / 3))
  const pos: number[] = []
  const idx: number[] = []
  for (let j = 0; j <= rows; j++) {
    const t = j / rows
    for (let i = 0; i <= seg; i++) {
      const th = (i / seg) * Math.PI * 2
      pos.push(Math.cos(th), 2 * t, (1 - t) * Math.sin(th))
    }
  }
  const w = seg + 1
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < seg; i++) {
      const a = j * w + i
      const b = a + 1
      const c = a + w
      const d = c + 1
      idx.push(a, c, b, b, c, d)
    }
  // Boden
  const base = pos.length / 3
  pos.push(0, 0, 0)
  for (let i = 0; i <= seg; i++) {
    const th = (i / seg) * Math.PI * 2
    pos.push(Math.cos(th), 0, Math.sin(th))
  }
  for (let i = 0; i < seg; i++) idx.push(base, base + 1 + i, base + 2 + i)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

function hexShape(r: number, hole?: number): THREE.Shape {
  const s = new THREE.Shape()
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r)
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  s.closePath()
  if (hole) {
    const h = new THREE.Path()
    h.absarc(0, 0, hole, 0, Math.PI * 2, true)
    s.holes.push(h)
  }
  return s
}

type Builder = (seg: number) => Part[]

const BUILDERS: Record<string, Builder> = {
  donut: (seg) => {
    const parts: Part[] = [
      { geo: new THREE.TorusGeometry(1, 0.42, seg / 2, seg), color: COL.softOrange, rot: [Math.PI / 2, 0, 0] },
      { geo: new THREE.TorusGeometry(1, 0.43, seg / 2, seg), color: COL.pink, rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.6], pos: [0, 0.1, 0] },
    ]
    const cols = [COL.cream, COL.lime, COL.cream, COL.orange]
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + (i % 3) * 0.2
      const rr = 1 + ((i * 37) % 7) / 25 - 0.12
      parts.push({
        geo: new THREE.BoxGeometry(0.16, 0.05, 0.05),
        color: cols[i % cols.length],
        pos: [Math.cos(a) * rr, 0.36, Math.sin(a) * rr],
        rot: [0, (i * 1.7) % Math.PI, 0],
      })
    }
    return parts
  },
  tasse: (seg) => [
    {
      geo: lathe([[0, 0], [0.64, 0], [0.7, 0.06], [0.7, 1.4], [0.62, 1.4], [0.62, 0.14], [0, 0.14]], seg),
      color: COL.pink,
      double: true,
    },
    { geo: new THREE.CircleGeometry(0.62, seg), color: COL.coffee, rot: [-Math.PI / 2, 0, 0], pos: [0, 1.18, 0] },
    { geo: new THREE.TorusGeometry(0.36, 0.09, 10, seg / 2, Math.PI), color: COL.pink, rot: [0, 0, -Math.PI / 2], pos: [0.68, 0.72, 0] },
  ],
  apfel: (seg) => [
    {
      geo: lathe([[0, 0.06], [0.3, 0], [0.62, 0.12], [0.82, 0.42], [0.84, 0.72], [0.7, 1.0], [0.42, 1.12], [0.16, 1.06], [0, 0.98]], seg),
      color: COL.pink,
    },
    { geo: new THREE.CylinderGeometry(0.04, 0.05, 0.34, 8), color: COL.ink, pos: [0.03, 1.14, 0], rot: [0, 0, -0.25] },
    { geo: new THREE.SphereGeometry(1, 12, 8), color: COL.lime, pos: [0.2, 1.22, 0], rot: [0, 0, 0.45], scale: [0.24, 0.05, 0.11] },
  ],
  bleistift: (seg) => [
    { geo: new THREE.CylinderGeometry(0.3, 0.3, 2.6, 6), color: COL.orange, rot: [0, 0, Math.PI / 2] },
    { geo: new THREE.CylinderGeometry(0, 0.3, 0.62, 6), color: COL.cream, rot: [0, 0, -Math.PI / 2], pos: [1.61, 0, 0] },
    { geo: new THREE.CylinderGeometry(0, 0.1, 0.2, 6), color: COL.ink, rot: [0, 0, -Math.PI / 2], pos: [1.83, 0, 0] },
    { geo: new THREE.CylinderGeometry(0.255, 0.255, 0.26, seg), color: COL.metal, rot: [0, 0, Math.PI / 2], pos: [-1.43, 0, 0] },
    { geo: new THREE.CylinderGeometry(0.24, 0.24, 0.3, seg), color: COL.pink, rot: [0, 0, Math.PI / 2], pos: [-1.71, 0, 0] },
  ],
  mutter: () => {
    const g = new THREE.ExtrudeGeometry(hexShape(0.7, 0.34), { depth: 0.28, bevelEnabled: false, curveSegments: 24 })
    g.translate(0, 0, -0.14)
    return [{ geo: g, color: COL.metal, rot: [Math.PI / 2, 0, 0] }]
  },
  dose: (seg) => [
    { geo: new THREE.CylinderGeometry(0.55, 0.55, 1.6, seg), color: COL.pink },
    { geo: new THREE.CylinderGeometry(0.56, 0.56, 0.62, seg), color: COL.cream },
    { geo: new THREE.CylinderGeometry(0.5, 0.5, 0.04, seg), color: COL.metal, pos: [0, 0.81, 0] },
  ],
  eimer: (seg) => [
    { geo: new THREE.CylinderGeometry(0.75, 0.55, 1.1, seg, 1, true), color: COL.lime, double: true },
    { geo: new THREE.CircleGeometry(0.55, seg), color: COL.lime, rot: [Math.PI / 2, 0, 0], pos: [0, -0.55, 0] },
    { geo: new THREE.TorusGeometry(0.75, 0.035, 8, seg, Math.PI), color: COL.ink, pos: [0, 0.55, 0] },
  ],
  weinglas: (seg) => [
    {
      geo: lathe(
        [[0, 0], [0.5, 0], [0.5, 0.05], [0.08, 0.1], [0.05, 0.25], [0.05, 0.8], [0.12, 0.88], [0.38, 0.98], [0.5, 1.2], [0.5, 1.48], [0.45, 1.72], [0.41, 1.72], [0.45, 1.48], [0.44, 1.22], [0.3, 1.02], [0, 0.98]],
        seg,
      ),
      color: COL.metal,
      double: true,
    },
  ],
  korken: (seg) => [{ geo: corkGeometry(seg), color: COL.softOrange, double: true }],
  partyhut: (seg) => [
    { geo: new THREE.ConeGeometry(0.7, 1.8, seg), color: COL.pink },
    { geo: new THREE.TorusGeometry(0.47, 0.05, 6, seg), color: COL.lime, rot: [Math.PI / 2, 0, 0], pos: [0, -0.3, 0], scale: [1, 1, 1] },
    { geo: new THREE.TorusGeometry(0.24, 0.045, 6, seg), color: COL.lime, rot: [Math.PI / 2, 0, 0], pos: [0, 0.3, 0] },
    { geo: new THREE.SphereGeometry(0.17, 12, 10), color: COL.cream, pos: [0, 0.95, 0] },
  ],
  ei: (seg) => {
    const pts: [number, number][] = []
    for (let i = 0; i <= 16; i++) {
      const t = i / 16
      const y = 1.6 * ((1 - Math.cos(Math.PI * t)) / 2)
      const r = 0.6 * Math.sin(Math.PI * t) * (1 + 0.16 * (1 - 2 * t))
      pts.push([Math.max(0, r), y])
    }
    return [{ geo: lathe(pts, seg), color: COL.cream }]
  },
  stuhl: () => {
    const parts: Part[] = [{ geo: new THREE.BoxGeometry(1, 0.12, 1), color: COL.orange, pos: [0, 0.9, 0] }]
    for (const x of [-0.42, 0.42])
      for (const z of [-0.42, 0.42]) parts.push({ geo: new THREE.BoxGeometry(0.1, 0.9, 0.1), color: COL.cream, pos: [x, 0.45, z] })
    for (const x of [-0.42, 0.42]) parts.push({ geo: new THREE.BoxGeometry(0.1, 1.0, 0.1), color: COL.cream, pos: [x, 1.45, -0.42] })
    parts.push({ geo: new THREE.BoxGeometry(0.94, 0.3, 0.08), color: COL.pink, pos: [0, 1.78, -0.42] })
    parts.push({ geo: new THREE.BoxGeometry(0.94, 0.08, 0.08), color: COL.pink, pos: [0, 1.32, -0.42] })
    return parts
  },
  tisch: () => {
    const parts: Part[] = [{ geo: new THREE.BoxGeometry(1.8, 0.1, 1.1), color: COL.lime, pos: [0, 1.0, 0] }]
    for (const x of [-0.8, 0.8]) for (const z of [-0.45, 0.45]) parts.push({ geo: new THREE.BoxGeometry(0.1, 0.95, 0.1), color: COL.cream, pos: [x, 0.475, z] })
    return parts
  },
  hocker: (seg) => {
    const parts: Part[] = [{ geo: new THREE.CylinderGeometry(0.5, 0.5, 0.12, seg), color: COL.orange, pos: [0, 1.0, 0] }]
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2
      parts.push({
        geo: new THREE.CylinderGeometry(0.045, 0.05, 1.04, 8),
        color: COL.cream,
        pos: [Math.cos(a) * 0.38, 0.48, Math.sin(a) * 0.38],
        rot: [Math.sin(a) * 0.22, 0, -Math.cos(a) * 0.22],
      })
    }
    parts.push({ geo: new THREE.TorusGeometry(0.4, 0.03, 6, seg), color: COL.cream, rot: [Math.PI / 2, 0, 0], pos: [0, 0.4, 0] })
    return parts
  },
  schirm: (seg) => [
    { geo: new THREE.SphereGeometry(1.2, 8, Math.max(6, seg / 4), 0, Math.PI * 2, 0, 1.0), color: COL.pink, double: true },
    { geo: new THREE.CylinderGeometry(0.04, 0.04, 2.25, 8), color: COL.cream, pos: [0, 0.18, 0] },
    { geo: new THREE.CylinderGeometry(0.02, 0.05, 0.18, 8), color: COL.ink, pos: [0, 1.28, 0] },
    { geo: new THREE.TorusGeometry(0.18, 0.055, 8, seg / 2, Math.PI), color: COL.ink, rot: [0, 0, Math.PI], pos: [0.18, -0.94, 0] },
  ],
  pilz: (seg) => {
    const parts: Part[] = [
      { geo: new THREE.SphereGeometry(0.95, seg, seg / 2, 0, Math.PI * 2, 0, Math.PI / 2), color: COL.pink, pos: [0, 1.0, 0], scale: [1, 0.68, 1] },
      { geo: new THREE.CircleGeometry(0.95, seg), color: COL.cream, rot: [Math.PI / 2, 0, 0], pos: [0, 1.0, 0] },
      { geo: new THREE.CylinderGeometry(0.3, 0.4, 1.0, seg), color: COL.cream, pos: [0, 0.5, 0] },
    ]
    const spots: [number, number][] = [[0.3, 0.4], [-0.45, 0.2], [0.1, -0.5], [-0.15, -0.05], [0.55, -0.25]]
    for (const [x, z] of spots) {
      const y = 1.0 + 0.68 * Math.sqrt(Math.max(0, 0.95 * 0.95 - x * x - z * z)) - 0.02
      parts.push({ geo: new THREE.SphereGeometry(0.12, 10, 8), color: COL.cream, pos: [x, y, z], scale: [1, 0.4, 1] })
    }
    return parts
  },
  lampe: (seg) => [
    { geo: new THREE.CylinderGeometry(0.42, 0.48, 0.08, seg), color: COL.ink, pos: [0, 0.04, 0] },
    { geo: new THREE.CylinderGeometry(0.035, 0.035, 2.0, 8), color: COL.cream, pos: [0, 1.04, 0] },
    { geo: new THREE.CylinderGeometry(0.34, 0.62, 0.62, seg, 1, true), color: COL.orange, pos: [0, 2.15, 0], double: true },
  ],
  hantel: (seg) => {
    const parts: Part[] = [{ geo: new THREE.CylinderGeometry(0.06, 0.06, 2.5, 10), color: COL.metal, rot: [0, 0, Math.PI / 2] }]
    for (const s of [-1, 1]) {
      parts.push({ geo: new THREE.CylinderGeometry(0.52, 0.52, 0.17, seg), color: COL.orange, rot: [0, 0, Math.PI / 2], pos: [s * 0.78, 0, 0] })
      parts.push({ geo: new THREE.CylinderGeometry(0.4, 0.4, 0.15, seg), color: COL.pink, rot: [0, 0, Math.PI / 2], pos: [s * 0.95, 0, 0] })
      parts.push({ geo: new THREE.CylinderGeometry(0.12, 0.12, 0.1, 12), color: COL.ink, rot: [0, 0, Math.PI / 2], pos: [s * 0.64, 0, 0] })
    }
    return parts
  },
  garnrolle: (seg) => [
    { geo: new THREE.CylinderGeometry(0.32, 0.32, 1.0, seg), color: COL.pink, rot: [0, 0, Math.PI / 2] },
    { geo: new THREE.CylinderGeometry(0.58, 0.58, 0.08, seg), color: COL.softOrange, rot: [0, 0, Math.PI / 2], pos: [-0.54, 0, 0] },
    { geo: new THREE.CylinderGeometry(0.58, 0.58, 0.08, seg), color: COL.softOrange, rot: [0, 0, Math.PI / 2], pos: [0.54, 0, 0] },
  ],
  knochen: (seg) => {
    const parts: Part[] = [{ geo: new THREE.CylinderGeometry(0.16, 0.16, 1.7, seg), color: COL.cream, rot: [0, 0, Math.PI / 2] }]
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) parts.push({ geo: new THREE.SphereGeometry(0.28, seg, seg / 2), color: COL.cream, pos: [sx * 0.88, sy * 0.19, 0] })
    return parts
  },
  birne_lampe: (seg) => [
    {
      geo: lathe(
        [[0, 0], [0.09, 0], [0.11, 0.07], [0.2, 0.1], [0.24, 0.15], [0.2, 0.21], [0.24, 0.27], [0.2, 0.33], [0.24, 0.39], [0.2, 0.45], [0.24, 0.51], [0.24, 0.56], [0, 0.56]],
        seg,
      ),
      color: COL.metal,
    },
    {
      geo: lathe([[0.24, 0.56], [0.25, 0.66], [0.32, 0.8], [0.48, 0.94], [0.6, 1.1], [0.64, 1.26], [0.6, 1.44], [0.46, 1.6], [0.24, 1.7], [0, 1.73]], seg),
      color: COL.glass,
    },
  ],
  birne_obst: (seg) => [
    {
      geo: lathe([[0, 0], [0.32, 0.02], [0.58, 0.14], [0.7, 0.38], [0.64, 0.62], [0.46, 0.8], [0.32, 0.98], [0.26, 1.16], [0.22, 1.3], [0.12, 1.38], [0, 1.4]], seg),
      color: COL.lime,
    },
    { geo: new THREE.CylinderGeometry(0.03, 0.04, 0.42, 8), color: COL.ink, pos: [0.07, 1.58, 0], rot: [0, 0, -0.35] },
    { geo: new THREE.SphereGeometry(1, 12, 8), color: COL.lime, pos: [-0.16, 1.62, 0], rot: [0, 0, -0.5], scale: [0.26, 0.05, 0.12] },
  ],
  eis: (seg) => [
    { geo: new THREE.ConeGeometry(0.45, 1.3, seg), color: COL.softOrange, rot: [Math.PI, 0, 0], pos: [0, 0.65, 0] },
    { geo: new THREE.SphereGeometry(0.52, seg, seg / 2), color: COL.pink, pos: [0, 1.42, 0] },
    { geo: new THREE.SphereGeometry(0.1, 10, 8), color: COL.cream, pos: [0.1, 1.95, 0.05] },
  ],
}

export interface ObjectInfo {
  name: string
  article: 'der' | 'die' | 'das'
  /** Blickwinkel für die Karten und das Ende der Auflösung */
  display: [number, number, number]
}

export const OBJECTS: Record<string, ObjectInfo> = {
  donut: { name: 'Donut', article: 'der', display: [0.75, 0, 0] },
  tasse: { name: 'Tasse', article: 'die', display: [0.35, -0.5, 0] },
  apfel: { name: 'Apfel', article: 'der', display: [0.3, 0, 0] },
  bleistift: { name: 'Bleistift', article: 'der', display: [0.45, -0.5, 0.25] },
  mutter: { name: 'Schraubenmutter', article: 'die', display: [0.8, 0, 0] },
  dose: { name: 'Dose', article: 'die', display: [0.35, 0, 0] },
  eimer: { name: 'Eimer', article: 'der', display: [0.35, 0, 0] },
  weinglas: { name: 'Weinglas', article: 'das', display: [0.25, 0, 0] },
  korken: { name: 'Wunderkorken', article: 'der', display: [-0.55, 0.65, 0] },
  partyhut: { name: 'Partyhut', article: 'der', display: [0.3, 0, 0] },
  ei: { name: 'Ei', article: 'das', display: [0.3, 0, 0.35] },
  stuhl: { name: 'Stuhl', article: 'der', display: [0.35, -0.75, 0] },
  tisch: { name: 'Tisch', article: 'der', display: [0.4, -0.5, 0] },
  hocker: { name: 'Hocker', article: 'der', display: [0.35, 0.3, 0] },
  schirm: { name: 'Regenschirm', article: 'der', display: [0.3, -0.4, 0] },
  pilz: { name: 'Pilz', article: 'der', display: [0.3, 0, 0] },
  lampe: { name: 'Stehlampe', article: 'die', display: [0.25, 0, 0] },
  hantel: { name: 'Hantel', article: 'die', display: [0.35, -0.55, 0] },
  garnrolle: { name: 'Garnrolle', article: 'die', display: [0.35, -0.55, 0] },
  knochen: { name: 'Hundeknochen', article: 'der', display: [0.35, -0.45, 0] },
  birne_lampe: { name: 'Glühbirne', article: 'die', display: [0.25, 0, 0] },
  birne_obst: { name: 'Birne', article: 'die', display: [0.25, 0, 0] },
  eis: { name: 'Eistüte', article: 'die', display: [0.2, 0, 0] },
}

export function buildObject(id: string, detail: Detail = 'high'): THREE.Group {
  const b = BUILDERS[id]
  if (!b) throw new Error('Unbekannter Gegenstand: ' + id)
  return assemble(b(detail === 'high' ? 48 : 16))
}
