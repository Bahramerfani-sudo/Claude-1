import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { GameShell } from '../../components/GameShell'
import { IconArrow, IconEye, IconHeart, IconPlay } from '../../components/Icons'
import { audioOut, playNote, sfx, unlockAudio, useMuted } from '../../lib/sound'
import { useStored } from '../../lib/storage'
import { Creature } from './Creature'
import { LIVES, NOTE_LEN, SCALE, START_LEN, STEP, barHeight, makeRound, type Round } from './melody.ts'
import './ton.css'

type Phase = 'idle' | 'playA' | 'gap' | 'playB' | 'answer' | 'feedback' | 'over'

function useSmallScreen() {
  const [small, setSmall] = useState(() => window.matchMedia('(max-width: 520px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 520px)')
    const on = () => setSmall(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return small
}

export default function FalscherTon() {
  const [best, setBest] = useStored<number | null>('ton:best', null)
  const [visual, setVisual] = useStored<boolean>('ton:visual', false)
  const muted = useMuted()
  const small = useSmallScreen()

  const [len, setLen] = useState(START_LEN)
  const [lives, setLives] = useState(LIVES)
  const [round, setRound] = useState<Round>(() => makeRound(START_LEN))
  const [phase, setPhase] = useState<Phase>('idle')
  const [active, setActive] = useState(-1)
  const [maxPlayed, setMaxPlayed] = useState(-1)
  const [picked, setPicked] = useState<number | null>(null)
  const [replayUsed, setReplayUsed] = useState(false)
  const [solved, setSolved] = useState(0)
  const [newBest, setNewBest] = useState(false)

  const tokenRef = useRef(0)
  const busRef = useRef<GainNode | null>(null)
  const timerRef = useRef<number | null>(null)

  const cancelPlayback = () => {
    tokenRef.current++
    if (timerRef.current) window.clearTimeout(timerRef.current)
    try {
      busRef.current?.disconnect()
    } catch {
      /* schon getrennt */
    }
    busRef.current = null
    setActive(-1)
  }

  useEffect(() => () => cancelPlayback(), [])

  const playMelody = (notes: number[], onDone: () => void) => {
    const token = ++tokenRef.current
    const a = audioOut()
    let bus: GainNode | undefined
    if (a) {
      bus = a.ctx.createGain()
      bus.connect(a.out)
      busRef.current = bus
    }
    notes.forEach((n, i) => playNote(SCALE[n], 0.12 + i * STEP, NOTE_LEN, { type: 'triangle', gain: 0.3, vibrato: 3, dest: bus }))
    const t0 = performance.now() + 120
    setMaxPlayed(-1)
    const tick = () => {
      if (token !== tokenRef.current) return
      const el = (performance.now() - t0) / 1000
      const idx = el < 0 ? -1 : Math.floor(el / STEP)
      const within = el >= 0 && el - idx * STEP < NOTE_LEN
      if (idx >= notes.length) {
        setActive(-1)
        onDone()
        return
      }
      setActive(within ? idx : -1)
      if (idx >= 0) setMaxPlayed((m) => Math.max(m, idx))
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  const runRound = (r: Round) => {
    unlockAudio()
    setPhase('playA')
    playMelody(r.a, () => {
      setPhase('gap')
      const token = tokenRef.current
      timerRef.current = window.setTimeout(() => {
        if (token !== tokenRef.current) return
        setPhase('playB')
        playMelody(r.b, () => setPhase('answer'))
      }, 900)
    })
  }

  const startGame = () => {
    cancelPlayback()
    const r = makeRound(START_LEN)
    setLen(START_LEN)
    setLives(LIVES)
    setRound(r)
    setPicked(null)
    setReplayUsed(false)
    setSolved(0)
    setNewBest(false)
    runRound(r)
  }

  const restart = () => {
    cancelPlayback()
    setLen(START_LEN)
    setLives(LIVES)
    setRound(makeRound(START_LEN))
    setPicked(null)
    setReplayUsed(false)
    setSolved(0)
    setNewBest(false)
    setPhase('idle')
    setMaxPlayed(-1)
  }

  const pick = (i: number) => {
    if (phase !== 'answer') return
    unlockAudio()
    setPicked(i)
    setPhase('feedback')
    const right = i === round.changed
    // Unterschied hörbar machen: erst richtig, dann falsch
    playNote(SCALE[round.a[round.changed]], 0.25, 0.3, { type: 'triangle', gain: 0.26 })
    playNote(SCALE[round.b[round.changed]], 0.65, 0.3, { type: 'triangle', gain: 0.26 })
    if (right) {
      sfx('win')
      setSolved(len)
      if (best == null || len > best) {
        setBest(len)
        setNewBest(true)
      }
    } else {
      sfx('lose')
      setLives((l) => l - 1)
    }
  }

  const next = () => {
    const right = picked === round.changed
    if (!right && lives <= 0) {
      setPhase('over')
      return
    }
    const nextLen = right ? len + 1 : len
    const r = makeRound(nextLen)
    setLen(nextLen)
    setRound(r)
    setPicked(null)
    setReplayUsed(false)
    runRound(r)
  }

  const replay = () => {
    if (phase !== 'answer' || replayUsed) return
    setReplayUsed(true)
    runRound(round)
  }

  const right = picked === round.changed
  const playing = phase === 'playA' || phase === 'playB'
  const source = phase === 'playA' ? round.a : round.b
  const singing = playing && active >= 0 ? barHeight(source[active]) : null
  const mood = phase === 'feedback' ? (right ? 'happy' : 'sad') : phase === 'answer' ? 'listen' : 'idle'
  const cols = Math.min(len, small ? 6 : 10)

  let line: string
  switch (phase) {
    case 'idle':
      line = `Pip singt dir eine Melodie aus ${len} Tönen vor. Beim zweiten Mal ist genau ein Ton anders.`
      break
    case 'playA':
      line = 'Hör gut zu …'
      break
    case 'gap':
    case 'playB':
      line = 'Und noch einmal – jetzt ist ein Ton falsch …'
      break
    case 'answer':
      line = 'Welcher Ton war anders? Tipp ihn an.'
      break
    case 'feedback':
      line = right ? `Richtig! Ton ${round.changed + 1} war anders.` : `Nicht ganz – es war Ton ${round.changed + 1}.`
      break
    default:
      line = ''
  }

  return (
    <GameShell game="ton" onRestart={restart} restartLabel="Neues Spiel">
      <div className="ton-top">
        <span className="chip">{len} Töne</span>
        <span className="ton-lives" aria-label={`${lives} von ${LIVES} Leben`}>
          {Array.from({ length: LIVES }, (_, i) => (
            <IconHeart key={i} className={i < lives ? 'is-full' : ''} width={22} height={22} />
          ))}
        </span>
        {best != null && <span className="chip">Bestwert: {best} Töne</span>}
        <button
          type="button"
          className={`icon-btn ton-visual${visual ? ' is-on' : ''}`}
          aria-pressed={visual}
          onClick={() => setVisual(!visual)}
          title="Tonhöhen als Balken zeigen"
        >
          <IconEye /> <span>Töne sehen</span>
        </button>
      </div>

      {phase !== 'over' ? (
        <>
          <p className="game-intro" aria-live="polite">
            {phase === 'idle' || phase === 'answer' ? <strong>{line}</strong> : line}
            {phase === 'feedback' && <> {right ? `Weiter geht’s mit ${len + 1} Tönen.` : lives > 0 ? 'Neue Melodie, gleiche Länge.' : ''}</>}
          </p>

          {muted && !visual && (
            <p className="ton-muted">Der Ton ist aus. Schalte ihn oben rechts ein oder spiel mit „Töne sehen“.</p>
          )}

          <div className="ton-stage">
            <Creature singing={singing} mood={mood} />
          </div>

          <div className="ton-tiles" style={{ '--cols': cols } as CSSProperties} role="group" aria-label="Töne der Melodie">
            {round.a.map((_, i) => {
              const showBars =
                phase === 'feedback' ||
                (visual && ((playing && i <= maxPlayed) || phase === 'answer'))
              const note = phase === 'playA' ? round.a[i] : round.b[i]
              const cls = [
                'ton-tile',
                i === active ? 'is-active' : '',
                phase === 'feedback' && i === round.changed ? 'is-right' : '',
                phase === 'feedback' && i === picked && !right ? 'is-wrong' : '',
              ].join(' ')
              return (
                <button key={i} type="button" className={cls} disabled={phase !== 'answer'} onClick={() => pick(i)} aria-label={`Ton ${i + 1}`}>
                  <span className="ton-bar-wrap">
                    {phase === 'feedback' && i === round.changed && (
                      <span className="ton-bar is-ghost" style={{ height: `${barHeight(round.a[i]) * 100}%` }} />
                    )}
                    {showBars && <span className="ton-bar" style={{ height: `${barHeight(note) * 100}%` }} />}
                  </span>
                  <span className="ton-num">{i + 1}</span>
                </button>
              )
            })}
          </div>

          <div className="ton-actions">
            {phase === 'idle' && (
              <button type="button" className="btn btn-orange btn-big" onClick={startGame} autoFocus>
                <IconPlay /> Melodie abspielen
              </button>
            )}
            {phase === 'answer' && (
              <button type="button" className="btn btn-ghost" onClick={replay} disabled={replayUsed}>
                {replayUsed ? 'Nur einmal pro Runde' : 'Beide nochmal anhören'}
              </button>
            )}
            {phase === 'feedback' && (
              <>
                {right || lives > 0 ? (
                  <button type="button" className="btn btn-orange btn-big pop-in" onClick={next} autoFocus>
                    {right ? `Weiter mit ${len + 1} Tönen` : 'Nächste Melodie'} <IconArrow />
                  </button>
                ) : (
                  <button type="button" className="btn btn-pink btn-big pop-in" onClick={next} autoFocus>
                    Auswertung <IconArrow />
                  </button>
                )}
                {phase === 'feedback' && <p className="ton-legend">Orange gestrichelt: so hoch war der Ton beim ersten Mal.</p>}
              </>
            )}
          </div>
        </>
      ) : (
        <div className="result-card ton-over pop-in">
          {newBest && <span className="new-best">Neuer Bestwert!</span>}
          <h2>{solved >= START_LEN ? `Bis ${solved} Töne geschafft` : 'Diesmal kein Treffer'}</h2>
          <p>
            {solved >= 8
              ? 'Absolutes Gehör? Pip ist beeindruckt.'
              : solved >= 5
                ? 'Gute Ohren! Lange Melodien sind richtig schwer.'
                : 'Falsche Töne verstecken sich gut. Noch eine Runde?'}
            {best != null && !newBest && <> Dein Bestwert: {best} Töne.</>}
          </p>
          <div className="ton-over-actions">
            <button type="button" className="btn btn-orange" onClick={startGame} autoFocus>
              Nochmal spielen
            </button>
            <a className="btn btn-ghost" href="#start" style={{ color: 'var(--ink)', borderColor: 'rgba(12,22,80,.25)' }}>
              Zur Übersicht
            </a>
          </div>
        </div>
      )}
    </GameShell>
  )
}
