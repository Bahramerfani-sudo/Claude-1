import { useState } from 'react'
import { GameShell } from '../../components/GameShell'
import { IconArrow, IconCheck } from '../../components/Icons'
import { useStored } from '../../lib/storage'
import { LEVELS } from './levels.ts'
import { StrichBoard, type BoardEvent } from './StrichBoard'
import './board.css'
import './strich.css'

export default function EinStrich() {
  const [solved, setSolved] = useStored<Record<string, number>>('strich:solved', {})
  const [idx, setIdx] = useState(() => {
    const first = LEVELS.findIndex((l) => !(l.id in solved))
    return first === -1 ? 0 : first
  })
  const [resetKey, setResetKey] = useState(0)
  const [wonIn, setWonIn] = useState<number | null>(null)
  const [fails, setFails] = useState(0)
  const [hint, setHint] = useState(false)
  const level = LEVELS[idx]
  const isLast = idx === LEVELS.length - 1
  const allSolved = LEVELS.every((l) => l.id in solved)

  const goto = (i: number) => {
    setIdx(i)
    setWonIn(null)
    setFails(0)
    setHint(false)
    setResetKey((k) => k + 1)
  }

  const onEvent = (e: BoardEvent) => {
    if (e.phase === 'won') {
      setWonIn(e.attempts)
      setSolved((old) => ({ ...old, [level.id]: Math.min(old[level.id] ?? Infinity, e.attempts) }))
    } else if (e.phase === 'lost') {
      setFails((f) => f + 1)
    } else if (e.phase === 'drawing') {
      setWonIn(null)
    }
  }

  return (
    <GameShell game="strich" onRestart={() => goto(idx)} restartLabel="Level neu">
      <nav className="level-chips" aria-label="Level auswählen">
        {LEVELS.map((l, i) => {
          const done = l.id in solved
          return (
            <button
              key={l.id}
              type="button"
              className={`level-chip${i === idx ? ' is-current' : ''}${done ? ' is-solved' : ''}`}
              aria-current={i === idx ? 'true' : undefined}
              aria-label={`Level ${i + 1}: ${l.name}${done ? ' (geschafft)' : ''}`}
              onClick={() => goto(i)}
            >
              <span className="num">{done ? <IconCheck width={16} height={16} /> : i + 1}</span>
              <span className="name">{l.name}</span>
            </button>
          )
        })}
      </nav>

      <p className="game-intro">
        <strong>
          Level {idx + 1} · {level.name}.
        </strong>{' '}
        {level.hint}
      </p>

      <StrichBoard
        level={level}
        resetKey={resetKey}
        onEvent={onEvent}
        showHint={hint && wonIn === null}
        readyText="Linie ziehen, loslassen – und die Kugel fällt."
        ariaLabel={`Spielfeld Level ${idx + 1}: ${level.hint}`}
      >
        {wonIn !== null && (
          <div className="board-overlay">
            <div className="result-card strich-win pop-in" role="status">
              <h2>{isLast && allSolved ? 'Alle fünf geschafft!' : 'Treffer!'}</h2>
              <p>{wonIn === 1 ? 'Gleich im ersten Versuch. Stark.' : `Geschafft im ${wonIn}. Versuch.`}</p>
              <div className="actions">
                {!isLast ? (
                  <button type="button" className="btn btn-orange" onClick={() => goto(idx + 1)} autoFocus>
                    Weiter zu Level {idx + 2} <IconArrow />
                  </button>
                ) : (
                  <a className="btn btn-orange" href="#/">
                    Zur Übersicht <IconArrow />
                  </a>
                )}
                <button type="button" className="btn btn-ghost" style={{ color: 'var(--ink)', borderColor: 'rgba(12,22,80,.25)' }} onClick={() => goto(idx)}>
                  Nochmal zeichnen
                </button>
              </div>
            </div>
          </div>
        )}
      </StrichBoard>

      {fails >= 3 && !hint && wonIn === null && (
        <button type="button" className="btn btn-ghost hint-btn" onClick={() => setHint(true)}>
          Tipp zeigen
        </button>
      )}
    </GameShell>
  )
}
