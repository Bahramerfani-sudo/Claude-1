import { useSyncExternalStore } from 'react'
import { load, save } from './storage'

// Alle Töne entstehen direkt im Browser (Web Audio).
// Der AudioContext wird erst bei einer Nutzeraktion erzeugt (unlockAudio).

let ctx: AudioContext | null = null
let master: GainNode | null = null
let muted: boolean = load('muted', false)
const subs = new Set<() => void>()
const VOLUME = 0.7

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext }

/** Nur aus Klick-/Tipp-/Tasten-Handlern aufrufen. */
export function unlockAudio(): void {
  if (typeof window === 'undefined') return
  if (!ctx) {
    const AC = window.AudioContext || (window as WebkitWindow).webkitAudioContext
    if (!AC) return
    try {
      ctx = new AC()
    } catch {
      return
    }
    master = ctx.createGain()
    master.gain.value = muted ? 0 : VOLUME
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
}

/** Liefert den Audio-Ausgang – aber nur, wenn er schon freigeschaltet ist und Ton an ist. */
export function audioOut(): { ctx: AudioContext; out: GainNode } | null {
  if (!ctx || !master || muted) return null
  return { ctx, out: master }
}

export function isMuted(): boolean {
  return muted
}

export function setMuted(m: boolean): void {
  muted = m
  save('muted', m)
  if (ctx && master) master.gain.setTargetAtTime(m ? 0 : VOLUME, ctx.currentTime, 0.02)
  subs.forEach((f) => f())
}

function subscribe(f: () => void) {
  subs.add(f)
  return () => subs.delete(f)
}

export function useMuted(): boolean {
  return useSyncExternalStore(subscribe, () => muted)
}

export interface NoteOptions {
  type?: OscillatorType
  gain?: number
  attack?: number
  release?: number
  vibrato?: number
  slideTo?: number
  /** eigener Ausgang (z. B. um eine Melodie abbrechen zu können) */
  dest?: AudioNode
}

/** Spielt einen Ton. `when` ist relativ zu jetzt (Sekunden). */
export function playNote(freq: number, when: number, dur: number, o: NoteOptions = {}): void {
  const a = audioOut()
  if (!a) return
  const { ctx: c, out } = a
  const t0 = c.currentTime + when
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = o.type ?? 'triangle'
  osc.frequency.setValueAtTime(freq, t0)
  if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, t0 + dur)
  const peak = o.gain ?? 0.3
  const attack = o.attack ?? 0.012
  const release = o.release ?? 0.12
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(peak, t0 + attack)
  g.gain.setValueAtTime(peak, t0 + Math.max(attack, dur - release))
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  if (o.vibrato) {
    const lfo = c.createOscillator()
    const lg = c.createGain()
    lfo.frequency.value = 5.5
    lg.gain.value = o.vibrato
    lfo.connect(lg).connect(osc.frequency)
    lfo.start(t0)
    lfo.stop(t0 + dur + 0.05)
  }
  osc.connect(g).connect(o.dest ?? out)
  osc.start(t0)
  osc.stop(t0 + dur + 0.05)
}

function noiseBuffer(c: AudioContext, seconds: number): AudioBuffer {
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return buf
}

export type Sfx = 'plink' | 'win' | 'lose' | 'click' | 'tick' | 'boom' | 'land' | 'spring'

export function sfx(name: Sfx, strength = 1): void {
  const a = audioOut()
  if (!a) return
  const { ctx: c, out } = a
  switch (name) {
    case 'plink':
      playNote(520 + 500 * Math.min(1, strength), 0, 0.09, { type: 'sine', gain: 0.12 * Math.min(1, 0.4 + strength) })
      break
    case 'spring':
      playNote(220, 0, 0.25, { type: 'square', gain: 0.07, slideTo: 880 })
      break
    case 'click':
      playNote(880, 0, 0.05, { type: 'square', gain: 0.05 })
      break
    case 'tick':
      playNote(1320, 0, 0.04, { type: 'sine', gain: 0.1 })
      break
    case 'win':
      ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => playNote(f, i * 0.09, 0.22, { type: 'triangle', gain: 0.18 }))
      break
    case 'land':
      ;[392, 523.25, 659.25, 783.99].forEach((f, i) => playNote(f, i * 0.11, 0.3, { type: 'sine', gain: 0.18 }))
      break
    case 'lose':
      playNote(330, 0, 0.18, { type: 'sawtooth', gain: 0.06, slideTo: 160 })
      playNote(247, 0.16, 0.3, { type: 'sawtooth', gain: 0.06, slideTo: 110 })
      break
    case 'boom': {
      const src = c.createBufferSource()
      src.buffer = noiseBuffer(c, 0.9)
      const f = c.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.setValueAtTime(1400, c.currentTime)
      f.frequency.exponentialRampToValueAtTime(60, c.currentTime + 0.8)
      const g = c.createGain()
      g.gain.setValueAtTime(0.6, c.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.85)
      src.connect(f).connect(g).connect(out)
      src.start()
      break
    }
  }
}

/** Dauerrauschen für das Triebwerk. */
export function createThruster() {
  let src: AudioBufferSourceNode | null = null
  let gain: GainNode | null = null
  return {
    set(on: boolean) {
      const a = audioOut()
      if (!a) {
        this.stop()
        return
      }
      const { ctx: c, out } = a
      if (!src) {
        src = c.createBufferSource()
        src.buffer = noiseBuffer(c, 2)
        src.loop = true
        const f = c.createBiquadFilter()
        f.type = 'bandpass'
        f.frequency.value = 420
        f.Q.value = 0.7
        gain = c.createGain()
        gain.gain.value = 0
        src.connect(f).connect(gain).connect(out)
        src.start()
      }
      gain!.gain.setTargetAtTime(on ? 0.22 : 0, c.currentTime, 0.04)
    },
    stop() {
      try {
        src?.stop()
      } catch {
        /* schon gestoppt */
      }
      src = null
      gain = null
    },
  }
}
