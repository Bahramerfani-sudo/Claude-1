import * as THREE from 'three'
import { OBJECTS, buildObject } from './objects.ts'
import { displayQuaternion, shadowQuaternion, type Puzzle } from './puzzles.ts'

const SHADOW_COLOR = '#18266f'
const BASE = 1.22 // halbe Bildhöhe in Welt-Einheiten (Gegenstand hat Radius 1)

let gradient: THREE.DataTexture | null = null
function toonGradient(): THREE.DataTexture {
  if (gradient) return gradient
  const data = new Uint8Array([105, 105, 105, 255, 185, 185, 185, 255, 255, 255, 255, 255])
  gradient = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat)
  gradient.minFilter = THREE.NearestFilter
  gradient.magFilter = THREE.NearestFilter
  gradient.needsUpdate = true
  return gradient
}

function paint(group: THREE.Object3D): THREE.Material[] {
  const mats: THREE.Material[] = []
  group.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    const mat = new THREE.MeshToonMaterial({
      color: new THREE.Color(m.userData.color as string),
      gradientMap: toonGradient(),
      side: m.userData.double ? THREE.DoubleSide : THREE.FrontSide,
    })
    m.material = mat
    mats.push(mat)
  })
  return mats
}

function lights(scene: THREE.Scene) {
  scene.add(new THREE.AmbientLight(0xffffff, 1.5))
  const sun = new THREE.DirectionalLight(0xffffff, 2.4)
  sun.position.set(-2.5, 3.5, 4)
  scene.add(sun)
  const rim = new THREE.DirectionalLight(0xffd9c0, 0.8)
  rim.position.set(3, -1, 2)
  scene.add(rim)
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export class ShadowStage {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 50)
  private shadowRoot = new THREE.Group()
  private objectRoot = new THREE.Group()
  private object: THREE.Group | null = null
  private mats: THREE.Material[] = []
  private qShadow = new THREE.Quaternion()
  private qDisplay = new THREE.Quaternion()
  private revealAt = -1
  private raf = 0
  private aspect = 1.6
  private disposed = false
  /** Mittelpunkt und halbe Ausdehnung des Schattens */
  private sc = { x: 0, y: 0, hw: 1, hh: 1 }

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.camera.position.set(0, 0, 10)
    this.camera.lookAt(0, 0, 0)
    lights(this.scene)
    this.shadowRoot.position.z = -3
    this.shadowRoot.scale.set(1, 1, 0.001) // plattgedrückt = Schattenriss
    this.scene.add(this.shadowRoot, this.objectRoot)
    const loop = (now: number) => {
      if (this.disposed) return
      this.raf = requestAnimationFrame(loop)
      this.update(now / 1000)
      this.renderer.render(this.scene, this.camera)
    }
    this.raf = requestAnimationFrame(loop)
  }

  resize(w: number, h: number) {
    if (w < 2 || h < 2) return
    this.renderer.setSize(w, h, false)
    this.aspect = w / h
    let hh = BASE
    let hw = BASE * this.aspect
    if (hw < BASE) {
      hw = BASE
      hh = BASE / this.aspect
    }
    this.camera.left = -hw
    this.camera.right = hw
    this.camera.top = hh
    this.camera.bottom = -hh
    this.camera.updateProjectionMatrix()
    if (this.revealAt < 0) this.layout(0)
  }

  setPuzzle(p: Puzzle) {
    this.clear()
    this.qShadow = shadowQuaternion(p)
    this.qDisplay = displayQuaternion(OBJECTS[p.answer].display)

    const shadow = buildObject(p.answer, 'high')
    const shadowMat = new THREE.MeshBasicMaterial({ color: SHADOW_COLOR, side: THREE.DoubleSide })
    shadow.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) m.material = shadowMat
    })
    shadow.quaternion.copy(this.qShadow)
    this.shadowRoot.position.set(0, 0, -3)
    this.shadowRoot.add(shadow)
    this.shadowRoot.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(shadow)
    this.sc = {
      x: (box.min.x + box.max.x) / 2,
      y: (box.min.y + box.max.y) / 2,
      hw: Math.max(0.05, (box.max.x - box.min.x) / 2),
      hh: Math.max(0.05, (box.max.y - box.min.y) / 2),
    }
    this.mats.push(shadowMat)

    const obj = buildObject(p.answer, 'high')
    this.mats.push(...paint(obj))
    obj.quaternion.copy(this.qShadow)
    obj.visible = false
    this.object = obj
    this.objectRoot.add(obj)
    this.revealAt = -1
    this.layout(0)
  }

  /** Startzoom: der Schatten füllt die Bühne. */
  private zoomStart() {
    const { hw, hh } = this.sc
    return Math.min(3, Math.max(0.5, Math.min(this.camera.right / (hw * 1.3), this.camera.top / (hh * 1.3))))
  }

  /** Anordnung zwischen Rätsel (e=0) und Auflösung (e=1). */
  private layout(e: number) {
    const g = 0.14
    const { x: cx, y: cy, hw, hh } = this.sc
    const wide = this.aspect >= 1.15
    let sx = 0
    let sy = 0
    let ox = 0
    let oy = 0
    let zEnd: number
    if (wide) {
      sx = -(1 + g)
      ox = hw + g
      const W = 1 + g + hw
      zEnd = Math.min(this.camera.right / (W * 1.06), this.camera.top / (Math.max(hh, 1) * 1.1))
    } else {
      sy = 1 + g
      oy = -(hh + g)
      const H = 1 + g + hh
      zEnd = Math.min(this.camera.top / (H * 1.06), this.camera.right / (Math.max(hw, 1) * 1.1))
    }
    const z0 = this.zoomStart()
    this.camera.zoom = z0 + (zEnd - z0) * e
    this.camera.updateProjectionMatrix()
    // e=0: Schatten mittig, Gegenstand deckungsgleich davor
    this.shadowRoot.position.set(-cx + (sx) * e, -cy + sy * e, -3)
    this.objectRoot.position.set(-cx + (ox + cx) * e, -cy + (oy + cy) * e, 0)
  }

  reveal() {
    this.revealAt = performance.now() / 1000
    if (this.object) {
      this.object.visible = true
      for (const m of this.mats) {
        if (m instanceof THREE.MeshToonMaterial) {
          m.transparent = true
          m.opacity = 0
        }
      }
    }
  }

  private update(now: number) {
    if (this.revealAt < 0 || !this.object) return
    const t = now - this.revealAt
    const fade = Math.min(1, t / 0.35)
    for (const m of this.mats) {
      if (m instanceof THREE.MeshToonMaterial) {
        m.opacity = fade
        m.transparent = fade < 1
      }
    }
    const e = ease(Math.min(1, Math.max(0, (t - 0.7) / 1.5)))
    const q = this.qShadow.clone().slerp(this.qDisplay, e)
    if (t > 2.2) {
      const wobble = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.sin((t - 2.2) * 0.9) * 0.35)
      q.premultiply(wobble)
    }
    this.object.quaternion.copy(q)

    this.layout(e)
  }

  private clear() {
    for (const root of [this.shadowRoot, this.objectRoot]) {
      for (const c of [...root.children]) {
        root.remove(c)
        c.traverse((o) => {
          const m = o as THREE.Mesh
          if (m.isMesh) m.geometry.dispose()
        })
      }
    }
    for (const m of this.mats) m.dispose()
    this.mats = []
    this.object = null
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.clear()
    this.renderer.dispose()
  }
}

/** Kleine Vorschaubilder der Gegenstände (aus der typischen Ansicht). */
const thumbCache = new Map<string, string>()
export function renderThumbs(ids: string[], size = 220): string[] {
  const missing = ids.filter((id) => !thumbCache.has(id))
  if (missing.length === 0) return ids.map((id) => thumbCache.get(id)!)
  const canvas = document.createElement('canvas')
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true })
  renderer.setPixelRatio(1)
  renderer.setSize(size, size, false)
  renderer.setClearColor(0x000000, 0)
  const cam = new THREE.OrthographicCamera(-1.08, 1.08, 1.08, -1.08, 0.1, 50)
  cam.position.set(0, 0, 10)
  for (const id of missing) {
    const scene = new THREE.Scene()
    lights(scene)
    const obj = buildObject(id, 'high')
    const mats = paint(obj)
    obj.quaternion.copy(displayQuaternion(OBJECTS[id].display))
    scene.add(obj)
    renderer.render(scene, cam)
    thumbCache.set(id, canvas.toDataURL('image/png'))
    obj.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) m.geometry.dispose()
    })
    mats.forEach((m) => m.dispose())
  }
  renderer.dispose()
  renderer.forceContextLoss()
  return ids.map((id) => thumbCache.get(id)!)
}
