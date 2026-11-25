// Spiellogik für „Innerer Takt“ – ohne DOM, damit sie testbar bleibt.

export const ROUNDS = 5
export const VISIBLE_SHARE = 0.2 // bei 10 s also genau 2 s sichtbar
const POOL = [3, 4.5, 5, 6, 7.5, 8, 12]

export function makeTargets(rand: () => number = Math.random): number[] {
  const pool = [...POOL]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return [10, ...pool.slice(0, ROUNDS - 1)]
}

const fmt2 = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function formatSeconds(s: number): string {
  return fmt2.format(s)
}

/** z. B. „0,23 Sekunden zu früh“ */
export function deviationText(elapsed: number, target: number): string {
  const d = elapsed - target
  const abs = Math.abs(d)
  if (abs < 0.005) return 'Auf die Hundertstel genau!'
  const unit = formatSeconds(abs) === '1,00' ? 'Sekunde' : 'Sekunden'
  return `${formatSeconds(abs)} ${unit} zu ${d < 0 ? 'früh' : 'spät'}`
}

export function verdict(elapsed: number, target: number): string {
  const rel = Math.abs(elapsed - target) / target
  if (rel < 0.01) return 'Wie ein Uhrwerk.'
  if (rel < 0.03) return 'Sehr gutes Gefühl.'
  if (rel < 0.08) return 'Ordentlich!'
  if (rel < 0.15) return 'Deine Uhr geht etwas eigen.'
  return 'Da tickt es ganz anders.'
}

/** Treffsicherheit in Prozent über alle Runden. */
export function accuracy(results: { elapsed: number; target: number }[]): number {
  const totalTarget = results.reduce((a, r) => a + r.target, 0)
  const totalDev = results.reduce((a, r) => a + Math.abs(r.elapsed - r.target), 0)
  if (!totalTarget) return 0
  return Math.max(0, Math.round((1 - totalDev / totalTarget) * 1000) / 10)
}
