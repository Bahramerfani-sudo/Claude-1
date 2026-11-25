import { load } from '../lib/storage'

export type GameId = 'strich' | 'takt' | 'schatten' | 'planet' | 'ton'

export interface GameMeta {
  id: GameId
  path: string
  title: string
  tagline: string
}

export const GAMES: Record<GameId, GameMeta> = {
  strich: {
    id: 'strich',
    path: '/ein-strich',
    title: 'Ein Strich',
    tagline: 'Eine Kugel, ein Becher – und du hast genau eine Linie.',
  },
  takt: {
    id: 'takt',
    path: '/innerer-takt',
    title: 'Innerer Takt',
    tagline: 'Wie genau sind zehn Sekunden in deinem Kopf?',
  },
  schatten: {
    id: 'schatten',
    path: '/schattenlabor',
    title: 'Schattenlabor',
    tagline: 'Welcher Gegenstand wirft diesen merkwürdigen Schatten?',
  },
  planet: {
    id: 'planet',
    path: '/kleiner-planet',
    title: 'Kleiner Planet',
    tagline: 'Lande auf einem Mond, auf dem jeder Tropfen Treibstoff zählt.',
  },
  ton: {
    id: 'ton',
    path: '/falscher-ton',
    title: 'Falscher Ton',
    tagline: 'Ein Ton hat sich verirrt. Hörst du, welcher?',
  },
}

/** Kurzer Fortschrittstext für die Kacheln der Startseite. */
export function progressLabel(id: GameId): string | null {
  switch (id) {
    case 'strich': {
      const solved = Object.keys(load<Record<string, number>>('strich:solved', {})).length
      return solved ? `${solved} von 5 Leveln geschafft` : null
    }
    case 'takt': {
      const best = load<number | null>('takt:best', null)
      return best != null ? `Bestwert: ${best.toLocaleString('de-DE', { maximumFractionDigits: 1 })} % genau` : null
    }
    case 'schatten': {
      const best = load<number | null>('schatten:best', null)
      return best != null ? `Bestwert: ${best} von 8 erkannt` : null
    }
    case 'planet': {
      const m = Object.keys(load<Record<string, number>>('planet:missions', {})).length
      return m ? `${m} von 3 Missionen gelandet` : null
    }
    case 'ton': {
      const best = load<number | null>('ton:best', null)
      return best != null ? `Bestwert: ${best} Töne` : null
    }
  }
}
