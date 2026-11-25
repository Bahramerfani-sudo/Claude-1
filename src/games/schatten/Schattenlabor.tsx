import { useEffect, useMemo, useRef, useState } from 'react'
import { GameShell } from '../../components/GameShell'
import { IconArrow } from '../../components/Icons'
import { sfx, unlockAudio } from '../../lib/sound'
import { load, save } from '../../lib/storage'
import { OBJECTS } from './objects.ts'
import { PUZZLES } from './puzzles.ts'
import { ShadowStage, renderThumbs } from './stage.ts'
import './schatten.css'

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function Schattenlabor() {
  const [round, setRound] = useState(0)
  const [choice, setChoice] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [best, setBest] = useState<number | null>(() => load<number | null>('schatten:best', null))
  const [newBest, setNewBest] = useState(false)
  const [glError, setGlError] = useState(false)
  const [game, setGame] = useState(0)

  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<ShadowStage | null>(null)

  const puzzle = PUZZLES[round]
  const options = useMemo(() => shuffled([puzzle.answer, ...puzzle.decoys]), [puzzle, game])
  const [thumbs, setThumbs] = useState<Record<string, string>>({})

  // 3D-Bühne einrichten
  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    let stage: ShadowStage
    try {
      stage = new ShadowStage(canvas)
    } catch {
      setGlError(true)
      return
    }
    stageRef.current = stage
    const resize = () => {
      const r = wrap.getBoundingClientRect()
      stage.resize(r.width, r.height)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)
    return () => {
      ro.disconnect()
      stage.dispose()
      stageRef.current = null
    }
  }, [])

  // neues Rätsel
  useEffect(() => {
    stageRef.current?.setPuzzle(puzzle)
    try {
      const ids = [puzzle.answer, ...puzzle.decoys]
      const urls = renderThumbs(ids)
      setThumbs((t) => ({ ...t, ...Object.fromEntries(ids.map((id, i) => [id, urls[i]])) }))
    } catch {
      /* ohne Vorschaubilder geht es auch */
    }
  }, [puzzle, game])

  const pick = (id: string) => {
    if (choice) return
    unlockAudio()
    setChoice(id)
    const right = id === puzzle.answer
    if (right) setScore((s) => s + 1)
    sfx(right ? 'win' : 'lose')
    stageRef.current?.reveal()
  }

  const next = () => {
    if (round + 1 < PUZZLES.length) {
      setRound(round + 1)
      setChoice(null)
    } else {
      const isBest = best == null || score > best
      if (isBest) {
        save('schatten:best', score)
        setBest(score)
      }
      setNewBest(isBest)
      setDone(true)
    }
  }

  const restart = () => {
    setRound(0)
    setChoice(null)
    setScore(0)
    setDone(false)
    setNewBest(false)
    setGame((g) => g + 1)
  }

  const right = choice === puzzle.answer

  return (
    <GameShell game="schatten" onRestart={restart} restartLabel="Neue Runde">
      <div className="schatten-head">
        <span className="chip">
          Rätsel {Math.min(round + 1, PUZZLES.length)} / {PUZZLES.length}
        </span>
        <span className="chip">{score} richtig</span>
      </div>
      <p className="game-intro">
        {choice === null ? (
          <>
            <strong>Welcher Gegenstand wirft diesen Schatten?</strong> Er kann dafür beliebig gedreht sein.
          </>
        ) : (
          <>
            <strong>{right ? 'Richtig!' : `Leider nein – es war ${OBJECTS[puzzle.answer].article} ${OBJECTS[puzzle.answer].name}.`}</strong> {puzzle.aha}
          </>
        )}
      </p>

      <div className={`schatten-stage${done ? ' is-hidden' : ''}`} ref={wrapRef}>
        <div className="schatten-lamp" aria-hidden="true">
          <svg viewBox="0 0 60 80">
            <path d="M30 0 V22" stroke="#0c1650" strokeWidth="4" />
            <path d="M6 22 h48 l-10 26 h-28z" fill="#ff7b22" stroke="#0c1650" strokeWidth="4" strokeLinejoin="round" />
            <circle cx="30" cy="50" r="7" fill="#fff3c4" stroke="#0c1650" strokeWidth="3" />
          </svg>
        </div>
        <canvas ref={canvasRef} role="img" aria-label={choice ? `Auflösung: ${OBJECTS[puzzle.answer].name}` : 'Ein rätselhafter Schatten an der Wand'} />
        {glError && <p className="schatten-error">Dein Browser kann leider kein WebGL – ohne das bleibt das Labor dunkel.</p>}
      </div>

      {!done && (
        <div className="schatten-options" role="group" aria-label="Antworten">
          {options.map((id) => {
            const state = choice === null ? '' : id === puzzle.answer ? ' is-right' : id === choice ? ' is-wrong' : ' is-dim'
            return (
              <button key={id} type="button" className={`schatten-card${state}`} onClick={() => pick(id)} disabled={choice !== null}>
                <span className="schatten-thumb">{thumbs[id] ? <img src={thumbs[id]} alt="" draggable={false} /> : null}</span>
                <span className="schatten-name">{OBJECTS[id].name}</span>
              </button>
            )
          })}
        </div>
      )}

      {choice !== null && !done && (
        <button type="button" className="btn btn-orange btn-big schatten-next pop-in" onClick={next} autoFocus>
          {round + 1 < PUZZLES.length ? 'Nächstes Rätsel' : 'Auswertung'} <IconArrow />
        </button>
      )}

      {done && (
        <div className="result-card schatten-summary pop-in">
          {newBest && <span className="new-best">Neuer Bestwert!</span>}
          <h2>
            {score} von {PUZZLES.length} erkannt
          </h2>
          <p>
            {score === PUZZLES.length
              ? 'Ein echtes Schattenauge. Nichts entgeht dir.'
              : score >= 6
                ? 'Starker Blick für Formen!'
                : score >= 4
                  ? 'Gar nicht schlecht – manche Schatten sind echt fies.'
                  : 'Schatten sind trickreich. Noch eine Runde?'}
            {best != null && !newBest && <> Dein Bestwert: {best} von 8.</>}
          </p>
          <div className="schatten-summary-actions">
            <button type="button" className="btn btn-orange" onClick={restart} autoFocus>
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
