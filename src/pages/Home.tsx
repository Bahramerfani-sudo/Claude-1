import { useEffect, useState, type ReactNode } from 'react'
import { GAMES, progressLabel, type GameId } from '../games/meta'
import { HERO_LEVEL } from '../games/strich/levels.ts'
import { StrichBoard, type BoardEvent } from '../games/strich/StrichBoard'
import { IconArrow, IconCheck } from '../components/Icons'
import { MuteButton } from '../components/GameShell'
import { PlanetArt, SchattenArt, TaktArt, TonArt } from '../illustrations/Art'
import { clearProgress } from '../lib/storage'
import '../games/strich/board.css'
import './home.css'

function useProgressTick() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const on = () => setTick((t) => t + 1)
    window.addEventListener('spieltrieb:storage', on)
    return () => window.removeEventListener('spieltrieb:storage', on)
  }, [])
}

interface TileProps {
  id: GameId
  art: ReactNode
  tone: 'orange' | 'cream' | 'pink' | 'lime'
  layout: 'takt' | 'schatten' | 'planet' | 'ton'
  number: number
}

function GameTile({ id, art, tone, layout, number }: TileProps) {
  const g = GAMES[id]
  const progress = progressLabel(id)
  return (
    <a href={`#${g.path.slice(1)}`} className={`tile tile-${tone} tile-${layout}`}>
      <div className="tile-art">{art}</div>
      <div className="tile-text">
        <span className="tile-num">Nr. {number}</span>
        <h3 className="tile-title">{g.title}</h3>
        <p className="tile-tagline">{g.tagline}</p>
        <div className="tile-foot">
          <span className="tile-play">
            Spielen <IconArrow width={20} height={20} />
          </span>
          {progress && (
            <span className="tile-progress">
              <IconCheck width={16} height={16} /> {progress}
            </span>
          )}
        </div>
      </div>
    </a>
  )
}

export default function Home() {
  useProgressTick()
  const [heroState, setHeroState] = useState<'idle' | 'drawing' | 'won' | 'lost'>('idle')
  const [heroKey, setHeroKey] = useState(0)
  const [confirmReset, setConfirmReset] = useState(false)
  const strichProgress = progressLabel('strich')

  const onHero = (e: BoardEvent) => {
    if (e.phase === 'won') setHeroState('won')
    else if (e.phase === 'lost') setHeroState('lost')
    else if (e.phase === 'drawing' || e.phase === 'falling') setHeroState('drawing')
  }

  return (
    <div className="home">
      <header className="home-head">
        <div className="home-topline">
          <span className="badge">5 Spiele · keine Anmeldung · alles bleibt auf deinem Gerät</span>
          <MuteButton />
        </div>
        <h1 className="wordmark" aria-label="Spieltrieb">
          <span className="wm-a">Spiel</span>
          <span className="wm-b">trieb</span>
        </h1>
        <p className="lede">Kleine Spiele für große Neugier. Reinklicken, sofort verstehen – und gleich das nächste ausprobieren.</p>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="kicker">Nr. 1 · Heute im Rampenlicht</span>
          <h2 id="hero-title" className="hero-title">
            Ein Strich
          </h2>
          <p className="hero-tagline">{GAMES.strich.tagline}</p>
          <p className="hero-try" aria-live="polite">
            {heroState === 'won'
              ? 'Treffer! Genau so geht’s. Die fünf echten Level sind kniffliger.'
              : heroState === 'lost'
                ? 'Knapp daneben. Zieh einfach eine neue Linie.'
                : 'Probier’s direkt hier: Zieh unter der orangen Kugel eine Linie, die sie in den grünen Becher bringt.'}
          </p>
          <div className="hero-actions">
            <a className="btn btn-orange btn-big" href="#ein-strich">
              Fünf Level spielen <IconArrow />
            </a>
            {strichProgress && (
              <span className="tile-progress on-dark">
                <IconCheck width={16} height={16} /> {strichProgress}
              </span>
            )}
          </div>
        </div>
        <div className="hero-board">
          <StrichBoard
            level={HERO_LEVEL}
            compact
            resetKey={heroKey}
            onEvent={onHero}
            ariaLabel="Probierfeld: Zieh mit Maus oder Finger eine Linie, damit die Kugel in den Becher rollt"
          >
            {heroState === 'idle' && (
              <div className="hero-hint" aria-hidden="true">
                <svg viewBox="0 0 640 360" preserveAspectRatio="none">
                  <path className="hero-hint-path" d="M120 120 C 220 170, 330 190, 420 215" />
                </svg>
                <span className="hero-hint-label">Hier zeichnen</span>
              </div>
            )}
            {heroState === 'won' && (
              <div className="hero-won pop-in">
                <a className="btn btn-lime" href="#ein-strich">
                  Weiter zu Level 1 <IconArrow />
                </a>
                <button type="button" className="btn btn-ghost" onClick={() => { setHeroKey((k) => k + 1); setHeroState('idle') }}>
                  Nochmal
                </button>
              </div>
            )}
          </StrichBoard>
        </div>
      </section>

      <section className="tiles" aria-label="Weitere Spiele">
        <GameTile id="takt" number={2} tone="orange" layout="takt" art={<TaktArt />} />
        <GameTile id="schatten" number={3} tone="cream" layout="schatten" art={<SchattenArt />} />
        <GameTile id="planet" number={4} tone="pink" layout="planet" art={<PlanetArt />} />
        <GameTile id="ton" number={5} tone="lime" layout="ton" art={<TonArt />} />
      </section>

      <footer className="home-foot">
        <p>
          <strong>Spieltrieb</strong> – gebaut mit Neugier, Canvas, SVG und ein bisschen Physik. Bestwerte werden nur in diesem Browser gespeichert.
        </p>
        {confirmReset ? (
          <div className="reset-confirm" role="group" aria-label="Fortschritt löschen?">
            <span>Alle Bestwerte und Level löschen?</span>
            <button
              type="button"
              className="btn btn-pink"
              onClick={() => {
                clearProgress()
                setConfirmReset(false)
              }}
            >
              Ja, löschen
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmReset(false)}>
              Abbrechen
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={() => setConfirmReset(true)}>
            Fortschritt zurücksetzen
          </button>
        )}
      </footer>
    </div>
  )
}
