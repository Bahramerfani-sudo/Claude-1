import { useCallback, useEffect, useRef, useState } from 'react'
import { GameShell } from '../../components/GameShell'
import { IconArrow, IconPlay } from '../../components/Icons'
import { sfx, unlockAudio } from '../../lib/sound'
import { load, save } from '../../lib/storage'
import { ROUNDS, VISIBLE_SHARE, accuracy, deviationText, formatSeconds, makeTargets, verdict } from './logic.ts'
import './takt.css'

type Phase = 'ready' | 'running' | 'result' | 'summary'
interface RoundResult {
  target: number
  elapsed: number
}

const R = 108
const CIRC = 2 * Math.PI * R

function quality(r: RoundResult): 'top' | 'ok' | 'off' {
  const rel = Math.abs(r.elapsed - r.target) / r.target
  return rel < 0.03 ? 'top' : rel < 0.1 ? 'ok' : 'off'
}

export default function InnererTakt() {
  const [targets, setTargets] = useState(() => makeTargets())
  const [round, setRound] = useState(0)
  const [phase, setPhase] = useState<Phase>('ready')
  const [hidden, setHidden] = useState(false)
  const [results, setResults] = useState<RoundResult[]>([])
  const [best, setBest] = useState<number | null>(() => load<number | null>('takt:best', null))
  const [newBest, setNewBest] = useState(false)

  const startRef = useRef(0)
  const rafRef = useRef(0)
  const digitsRef = useRef<HTMLSpanElement>(null)
  const arcRef = useRef<SVGCircleElement>(null)
  const stopBtnRef = useRef<HTMLButtonElement>(null)
  const phaseRef = useRef<Phase>('ready')
  phaseRef.current = phase

  const target = targets[round]
  const last = results[results.length - 1]

  const restart = () => {
    cancelAnimationFrame(rafRef.current)
    setTargets(makeTargets())
    setRound(0)
    setResults([])
    setPhase('ready')
    setHidden(false)
    setNewBest(false)
  }

  const start = () => {
    unlockAudio()
    sfx('click')
    setHidden(false)
    setPhase('running')
    startRef.current = performance.now()
    const visibleFor = target * VISIBLE_SHARE
    let hid = false
    const tick = (now: number) => {
      const t = (now - startRef.current) / 1000
      if (!hid) {
        if (digitsRef.current) digitsRef.current.textContent = formatSeconds(Math.min(t, visibleFor))
        if (arcRef.current) arcRef.current.style.strokeDashoffset = String(CIRC * (1 - Math.min(t, visibleFor) / target))
        if (t >= visibleFor) {
          hid = true
          setHidden(true)
        }
      }
      if (t > target * 2.5 + 2) {
        stop(now)
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    requestAnimationFrame(() => stopBtnRef.current?.focus())
  }

  const stop = useCallback(
    (now = performance.now()) => {
      if (phaseRef.current !== 'running') return
      cancelAnimationFrame(rafRef.current)
      const elapsed = (now - startRef.current) / 1000
      const res = { target, elapsed }
      sfx(quality(res) === 'top' ? 'win' : 'click')
      phaseRef.current = 'result'
      setResults((r) => [...r, res])
      setPhase('result')
    },
    [target],
  )

  const next = () => {
    if (round + 1 < ROUNDS) {
      setRound(round + 1)
      setPhase('ready')
      setHidden(false)
    } else {
      const acc = accuracy(results)
      const isBest = best == null || acc > best
      if (isBest) {
        save('takt:best', acc)
        setBest(acc)
      }
      setNewBest(isBest)
      setPhase('summary')
    }
  }

  // Leertaste / Enter stoppt
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      if ((e.code === 'Space' || e.code === 'Enter') && phaseRef.current === 'running') {
        e.preventDefault()
        stop(performance.now())
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stop])

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  const acc = phase === 'summary' ? accuracy(results) : 0
  const span = last ? Math.max(1, Math.abs(last.elapsed - last.target) * 1.4) : 1

  return (
    <GameShell game="takt" onRestart={restart} restartLabel="Neue Partie">
      <ol className="takt-rounds" aria-label="Runden">
        {targets.map((t, i) => {
          const r = results[i]
          return (
            <li key={i} className={`takt-round${i === round && phase !== 'summary' ? ' is-current' : ''}${r ? ` is-${quality(r)}` : ''}`}>
              <span className="takt-round-n">{i + 1}</span>
              <span className="takt-round-t">{t.toLocaleString('de-DE')} s</span>
            </li>
          )
        })}
      </ol>

      {phase !== 'summary' && (
        <>
          <p className="game-intro">
            {phase === 'ready' && (
              <>
                <strong>Runde {round + 1} von 5:</strong> Stoppe genau bei <strong>{formatSeconds(target)} Sekunden</strong>. Die Uhr siehst du nur in den ersten {formatSeconds(target * VISIBLE_SHARE)} Sekunden.
              </>
            )}
            {phase === 'running' && (hidden ? <strong>Jetzt zählt nur dein Gefühl …</strong> : <>Merk dir das Tempo …</>)}
            {phase === 'result' && last && <>{verdict(last.elapsed, last.target)}</>}
          </p>

          <div className={`takt-dial${hidden && phase === 'running' ? ' is-hidden' : ''}${phase === 'result' ? ' is-result' : ''}`}>
            <svg viewBox="0 0 260 260" aria-hidden="true">
              <circle cx="130" cy="130" r="124" className="dial-rim" />
              <circle cx="130" cy="130" r={R} className="dial-track" />
              {Array.from({ length: 40 }, (_, i) => {
                const a = (i / 40) * Math.PI * 2
                const long = i % 5 === 0
                return (
                  <line
                    key={i}
                    x1={130 + Math.sin(a) * (long ? 92 : 98)}
                    y1={130 - Math.cos(a) * (long ? 92 : 98)}
                    x2={130 + Math.sin(a) * 102}
                    y2={130 - Math.cos(a) * 102}
                    className={long ? 'dial-tick long' : 'dial-tick'}
                  />
                )
              })}
              <circle
                ref={arcRef}
                cx="130"
                cy="130"
                r={R}
                className="dial-arc"
                strokeDasharray={CIRC}
                strokeDashoffset={phase === 'ready' ? CIRC : undefined}
                transform="rotate(-90 130 130)"
              />
              {/* sichtbarer Anteil */}
              <circle
                cx="130"
                cy="130"
                r={R + 14}
                className="dial-visible"
                strokeDasharray={`${2 * Math.PI * (R + 14) * VISIBLE_SHARE} ${2 * Math.PI * (R + 14)}`}
                transform="rotate(-90 130 130)"
              />
            </svg>
            <div className="dial-center">
              {phase === 'result' && last ? (
                <div className="dial-result pop-in">
                  <span className="dial-label">gestoppt bei</span>
                  <span className="dial-digits">{formatSeconds(last.elapsed)}</span>
                  <span className="dial-label">Ziel {formatSeconds(last.target)} s</span>
                </div>
              ) : (
                <>
                  <span className="dial-digits" ref={digitsRef}>
                    0,00
                  </span>
                  <span className="dial-label">{hidden ? 'Uhr ist weg' : `Ziel ${formatSeconds(target)} s`}</span>
                </>
              )}
            </div>
            <div className="dial-fog" aria-hidden="true">
              <span>?</span>
            </div>
          </div>

          <div className="takt-controls">
            {phase === 'ready' && (
              <button type="button" className="btn btn-orange btn-big" onClick={start} autoFocus>
                <IconPlay /> Start
              </button>
            )}
            {phase === 'running' && (
              <button
                ref={stopBtnRef}
                type="button"
                className="btn btn-pink btn-big takt-stop"
                onPointerDown={(e) => {
                  e.preventDefault()
                  stop(performance.now())
                }}
                onClick={() => stop(performance.now())}
              >
                Stopp!
              </button>
            )}
            {phase === 'result' && last && (
              <div className="takt-result pop-in" role="status">
                <p className="takt-dev">{deviationText(last.elapsed, last.target)}</p>
                <div className="takt-line" aria-hidden="true">
                  <div className="takt-line-axis" />
                  <div className="takt-line-target" style={{ left: '50%' }}>
                    <span>Ziel</span>
                  </div>
                  <div
                    className="takt-line-you"
                    style={{ left: `${50 + ((last.elapsed - last.target) / span) * 45}%` }}
                  >
                    <span>Du</span>
                  </div>
                </div>
                <button type="button" className="btn btn-orange btn-big" onClick={next} autoFocus>
                  {round + 1 < ROUNDS ? (
                    <>
                      Runde {round + 2} <IconArrow />
                    </>
                  ) : (
                    <>
                      Auswertung <IconArrow />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
          {phase === 'running' && <p className="takt-keyhint">Tippen, klicken oder Leertaste</p>}
        </>
      )}

      {phase === 'summary' && (
        <div className="takt-summary result-card pop-in">
          {newBest && <span className="new-best">Neuer Bestwert!</span>}
          <h2>{acc.toLocaleString('de-DE')} % genau</h2>
          <p>
            Insgesamt {formatSeconds(results.reduce((a, r) => a + Math.abs(r.elapsed - r.target), 0))} Sekunden daneben.
            {best != null && !newBest && <> Dein Bestwert: {best.toLocaleString('de-DE')} %.</>}
          </p>
          <table className="takt-table">
            <thead>
              <tr>
                <th>Ziel</th>
                <th>Gestoppt</th>
                <th>Abweichung</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className={`is-${quality(r)}`}>
                  <td>{formatSeconds(r.target)} s</td>
                  <td>{formatSeconds(r.elapsed)} s</td>
                  <td>{deviationText(r.elapsed, r.target).replace('Sekunden', 's').replace('Sekunde', 's')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="takt-summary-actions">
            <button type="button" className="btn btn-orange" onClick={restart} autoFocus>
              Nochmal spielen
            </button>
            <a className="btn btn-ghost" href="#/" style={{ color: 'var(--ink)', borderColor: 'rgba(12,22,80,.25)' }}>
              Zur Übersicht
            </a>
          </div>
        </div>
      )}
    </GameShell>
  )
}
