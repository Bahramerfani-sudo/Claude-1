// Melodien für „Falscher Ton“ (ohne DOM, testbar).

/** C-Dur-Pentatonik, C4 bis A5 – klingt immer freundlich. */
export const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0]
export const NOTE_LEN = 0.34
export const STEP = 0.46
export const START_LEN = 3
export const LIVES = 3

export interface Round {
  a: number[]
  b: number[]
  changed: number
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)]
}

/** Wie weit sich der falsche Ton verschiebt (in Tonleiterstufen) – wird mit der Länge feiner. */
export function shiftOptions(len: number): number[] {
  if (len <= 4) return [2, 3]
  if (len <= 7) return [1, 2]
  return [1]
}

export function makeRound(len: number, rand: () => number = Math.random): Round {
  const top = SCALE.length - 1
  const a: number[] = [2 + Math.floor(rand() * 5)]
  for (let i = 1; i < len; i++) {
    let n = a[i - 1] + pick([-2, -1, 1, 2, 3, -3, 1, -1], rand)
    if (n < 0) n = 1
    if (n > top) n = top - 1
    a.push(n)
  }
  const changed = Math.floor(rand() * len)
  const opts: number[] = []
  for (const d of shiftOptions(len)) for (const sgn of [-1, 1]) {
    const n = a[changed] + sgn * d
    if (n >= 0 && n <= top) opts.push(n)
  }
  const b = [...a]
  b[changed] = pick(opts, rand)
  return { a, b, changed }
}

/** Höhe eines Balkens im visuellen Modus (0..1). */
export function barHeight(note: number): number {
  return 0.18 + (note / (SCALE.length - 1)) * 0.82
}
