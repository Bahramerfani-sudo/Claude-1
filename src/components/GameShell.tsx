import { useEffect, type ReactNode } from 'react'
import { IconBack, IconMute, IconRestart, IconSound } from './Icons'
import { setMuted, unlockAudio, useMuted } from '../lib/sound'
import type { GameId } from '../games/meta'
import { GAMES } from '../games/meta'

export function MuteButton({ className = '' }: { className?: string }) {
  const muted = useMuted()
  return (
    <button
      type="button"
      className={`icon-btn ${className}`}
      aria-pressed={muted}
      aria-label={muted ? 'Ton einschalten' : 'Ton ausschalten'}
      title={muted ? 'Ton einschalten' : 'Ton ausschalten'}
      onClick={() => {
        unlockAudio()
        setMuted(!muted)
      }}
    >
      {muted ? <IconMute /> : <IconSound />}
      <span className="icon-btn-label">{muted ? 'Ton aus' : 'Ton an'}</span>
    </button>
  )
}

interface Props {
  game: GameId
  onRestart?: () => void
  restartLabel?: string
  children: ReactNode
}

export function GameShell({ game, onRestart, restartLabel = 'Neustart', children }: Props) {
  const meta = GAMES[game]
  useEffect(() => {
    document.title = `${meta.title} · Spieltrieb`
  }, [meta.title])

  return (
    <div className={`game-shell game-${game}`}>
      <header className="game-bar">
        <a href="#start" className="back-btn">
          <IconBack />
          <span>Übersicht</span>
        </a>
        <h1 className="game-title">{meta.title}</h1>
        <div className="bar-actions">
          {onRestart && (
            <button type="button" className="icon-btn" onClick={onRestart} title={restartLabel} aria-label={restartLabel}>
              <IconRestart />
              <span className="icon-btn-label">{restartLabel}</span>
            </button>
          )}
          <MuteButton />
        </div>
      </header>
      <main className="game-main">{children}</main>
    </div>
  )
}
