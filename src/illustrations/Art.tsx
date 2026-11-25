// Handgezeichnete SVG-Illustrationen – jede zeigt einen echten Moment aus dem Spiel.

const INK = '#0c1650'
const CREAM = '#f7eedb'
const ORANGE = '#ff7b22'
const PINK = '#ff4f93'
const LIME = '#c4f23a'
const BLUE = '#102069'
const DEEP = '#0a1548'

/** Innerer Takt: Die Uhr verschwindet nach zwei Sekunden – und am Ende steht die Abweichung. */
export function TaktArt() {
  return (
    <svg viewBox="0 0 400 250" role="img" aria-label="Eine Stoppuhr, deren Anzeige verschwimmt, daneben das Ergebnis: 0,23 Sekunden zu früh">
      <defs>
        <pattern id="takt-dots" width="9" height="9" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.6" fill={INK} opacity="0.18" />
        </pattern>
        <pattern id="takt-frost" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
          <rect width="8" height="8" fill={CREAM} />
          <rect width="3" height="8" fill={INK} opacity="0.12" />
        </pattern>
        <clipPath id="takt-face">
          <circle cx="128" cy="140" r="78" />
        </clipPath>
      </defs>
      <rect width="400" height="250" fill="url(#takt-dots)" />
      {/* Stoppuhr */}
      <rect x="114" y="34" width="28" height="22" rx="5" fill={CREAM} stroke={INK} strokeWidth="4" />
      <rect x="104" y="24" width="48" height="14" rx="6" fill={PINK} stroke={INK} strokeWidth="4" />
      <path d="M190 74 l14 -14" stroke={INK} strokeWidth="9" strokeLinecap="round" />
      <circle cx="128" cy="140" r="92" fill={INK} />
      <circle cx="128" cy="140" r="78" fill={CREAM} />
      <g clipPath="url(#takt-face)">
        {/* Skala */}
        {Array.from({ length: 30 }, (_, i) => {
          const a = (i / 30) * Math.PI * 2
          const r1 = i % 5 === 0 ? 62 : 68
          return (
            <line
              key={i}
              x1={128 + Math.sin(a) * r1}
              y1={140 - Math.cos(a) * r1}
              x2={128 + Math.sin(a) * 74}
              y2={140 - Math.cos(a) * 74}
              stroke={INK}
              strokeWidth={i % 5 === 0 ? 4 : 2}
            />
          )
        })}
        {/* sichtbarer Teil: 0 bis 2 Sekunden */}
        <path d="M128 140 L128 62 A78 78 0 0 1 174 77 Z" fill={LIME} opacity="0.9" />
        {/* der „verschwundene“ Rest */}
        <path d="M128 140 L174 77 A78 78 0 1 1 128 62 Z" fill="url(#takt-frost)" opacity="0.92" />
        <text x="76" y="132" textAnchor="middle" fontFamily="Bricolage Grotesque Variable, sans-serif" fontSize="34" fontWeight="800" fill={INK} opacity="0.7">
          ?
        </text>
        <text x="180" y="138" textAnchor="middle" fontFamily="Bricolage Grotesque Variable, sans-serif" fontSize="24" fontWeight="800" fill={INK} opacity="0.45">
          ?
        </text>
      </g>
      {/* Anzeige: links noch lesbar, rechts schon verschwommen */}
      <rect x="78" y="154" width="100" height="36" rx="8" fill={CREAM} stroke={INK} strokeWidth="3" />
      <text x="128" y="181" textAnchor="middle" fontFamily="DM Mono, monospace" fontSize="27" fontWeight="500" fill={INK}>
        2,00
      </text>
      <rect x="130" y="156" width="46" height="32" rx="6" fill="url(#takt-frost)" opacity="0.95" />
      <text x="104" y="118" textAnchor="middle" fontFamily="Bricolage Grotesque Variable, sans-serif" fontSize="11" fontWeight="800" fill={INK} letterSpacing="1">
        ZIEL 10 SEK
      </text>
      <line x1="128" y1="140" x2="168" y2="84" stroke={PINK} strokeWidth="6" strokeLinecap="round" />
      <circle cx="128" cy="140" r="8" fill={INK} />

      {/* Ergebnis */}
      <g transform="translate(236 66) rotate(-4)">
        <rect width="150" height="58" rx="29" fill={PINK} stroke={INK} strokeWidth="4" />
        <text x="75" y="26" textAnchor="middle" fontFamily="DM Mono, monospace" fontSize="21" fontWeight="500" fill={INK}>
          0,23 s
        </text>
        <text x="75" y="45" textAnchor="middle" fontFamily="Bricolage Grotesque Variable, sans-serif" fontSize="15" fontWeight="800" fill={INK}>
          ZU FRÜH
        </text>
      </g>
      {/* Zeitleiste: Ziel vs. du */}
      <g transform="translate(232 160)">
        <line x1="0" y1="20" x2="156" y2="20" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        {[0, 39, 78, 117, 156].map((x) => (
          <line key={x} x1={x} y1="12" x2={x} y2="28" stroke={INK} strokeWidth="3" />
        ))}
        <rect x="112" y="-6" width="12" height="52" rx="4" fill={LIME} stroke={INK} strokeWidth="3" />
        <circle cx="96" cy="20" r="9" fill={CREAM} stroke={INK} strokeWidth="4" />
        <text x="96" y="62" textAnchor="middle" fontFamily="Bricolage Grotesque Variable, sans-serif" fontSize="13" fontWeight="800" fill={INK}>
          DU
        </text>
        <text x="122" y="62" textAnchor="start" fontFamily="Bricolage Grotesque Variable, sans-serif" fontSize="13" fontWeight="800" fill={INK}>
          ZIEL
        </text>
      </g>
    </svg>
  )
}

/** Schattenlabor: Ein Sechseck an der Wand – und der Bleistift dreht sich aus seinem Schatten. */
export function SchattenArt() {
  const hex = (cx: number, cy: number, r: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i + Math.PI / 6
      return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`
    }).join(' ')
  return (
    <svg viewBox="0 0 300 380" role="img" aria-label="Eine Lampe wirft einen sechseckigen Schatten an die Wand; davor dreht sich ein Bleistift aus der Schattenansicht. Zur Wahl: Stift, Mutter, Tasse">
      <defs>
        <pattern id="sch-dots" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.5" fill={INK} opacity="0.14" />
        </pattern>
        <linearGradient id="sch-beam" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor={ORANGE} stopOpacity="0.55" />
          <stop offset="1" stopColor={ORANGE} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Wand */}
      <rect x="18" y="18" width="264" height="232" rx="16" fill="#e9dcbd" stroke={INK} strokeWidth="4" />
      <rect x="18" y="18" width="264" height="232" rx="16" fill="url(#sch-dots)" />
      <path d="M36 80 L280 60 L280 250 L60 250 Z" fill="url(#sch-beam)" />
      {/* Schatten */}
      <polygon points={hex(170, 120, 62)} fill={BLUE} />
      <circle cx="170" cy="120" r="9" fill={BLUE} />
      {/* Lampe */}
      <path d="M30 18 L30 52" stroke={INK} strokeWidth="4" />
      <path d="M8 52 h44 l-10 26 h-24z" fill={ORANGE} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      {/* Bleistift, halb herausgedreht */}
      <g transform="translate(150 196) rotate(-28)">
        <polygon points="-74,-16 34,-16 34,16 -74,16" fill={ORANGE} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <polygon points="-74,-5 34,-5 34,5 -74,5" fill="#ff9a52" />
        <polygon points="34,-16 70,0 34,16" fill={CREAM} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <polygon points="58,-5.5 70,0 58,5.5" fill={INK} />
        <rect x="-96" y="-16" width="22" height="32" rx="5" fill={PINK} stroke={INK} strokeWidth="4" />
      </g>
      {/* Drehpfeil */}
      <path d="M232 206 a40 40 0 0 0 -22 -40" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" strokeDasharray="2 8" />
      <path d="M204 160 l10 4 -2 10" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

      {/* Drei Antwortkarten */}
      {[
        { x: 18, label: 'Stift', ok: true },
        { x: 110, label: 'Mutter', ok: false },
        { x: 202, label: 'Tasse', ok: false },
      ].map((c) => (
        <g key={c.label} transform={`translate(${c.x} 272)`}>
          <rect width="80" height="92" rx="12" fill={c.ok ? LIME : CREAM} stroke={INK} strokeWidth="4" />
          {c.label === 'Stift' && (
            <g transform="translate(40 38) rotate(-35)">
              <rect x="-24" y="-6" width="34" height="12" fill={ORANGE} stroke={INK} strokeWidth="3" />
              <polygon points="10,-6 22,0 10,6" fill={CREAM} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
              <rect x="-31" y="-6" width="8" height="12" fill={PINK} stroke={INK} strokeWidth="3" />
            </g>
          )}
          {c.label === 'Mutter' && (
            <g>
              <polygon points={hex(40, 38, 20)} fill="#b9c0d8" stroke={INK} strokeWidth="3" />
              <circle cx="40" cy="38" r="8" fill={CREAM} stroke={INK} strokeWidth="3" />
            </g>
          )}
          {c.label === 'Tasse' && (
            <g>
              <path d="M54 30 a9 9 0 0 1 0 18" fill="none" stroke={INK} strokeWidth="5" />
              <rect x="22" y="22" width="32" height="34" rx="4" fill={PINK} stroke={INK} strokeWidth="3" />
              <ellipse cx="38" cy="23" rx="16" ry="4" fill="#6b3a1f" stroke={INK} strokeWidth="3" />
            </g>
          )}
          <text x="40" y="80" textAnchor="middle" fontFamily="Bricolage Grotesque Variable, sans-serif" fontSize="14" fontWeight="800" fill={INK}>
            {c.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

/** Kleiner Planet: Anflug auf die markierte Landezone, Treibstoff fast leer. */
export function PlanetArt() {
  const stars = [
    [30, 30], [80, 70], [140, 22], [210, 48], [300, 26], [360, 70], [380, 150], [24, 140], [56, 210], [340, 214], [250, 90], [110, 120],
  ]
  return (
    <svg viewBox="0 0 400 260" role="img" aria-label="Ein Raumschiff mit Flamme sinkt auf einen winzigen Mond mit grün markierter Landezone">
      <rect width="400" height="260" rx="14" fill={DEEP} />
      {stars.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 2.4 : 1.5} fill={CREAM} opacity={i % 2 ? 0.6 : 1} />
      ))}
      {/* Flugbahn */}
      <path d="M40 40 C 120 30, 200 40, 236 96" fill="none" stroke={CREAM} strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" opacity="0.7" />
      {/* Mond */}
      <circle cx="232" cy="258" r="108" fill={CREAM} />
      <circle cx="232" cy="258" r="108" fill="none" stroke={INK} strokeWidth="4" />
      <circle cx="176" cy="216" r="14" fill="#e3d4b2" />
      <circle cx="296" cy="226" r="20" fill="#e3d4b2" />
      <circle cx="252" cy="196" r="8" fill="#e3d4b2" />
      <circle cx="140" cy="250" r="9" fill="#e3d4b2" />
      {/* Landezone */}
      <path d="M200 155 A108 108 0 0 1 264 155" fill="none" stroke={LIME} strokeWidth="9" strokeLinecap="round" />
      <line x1="200" y1="156" x2="196" y2="128" stroke={CREAM} strokeWidth="3" />
      <path d="M196 128 l-16 5 15 6z" fill={LIME} />
      <line x1="264" y1="156" x2="268" y2="128" stroke={CREAM} strokeWidth="3" />
      <path d="M268 128 l16 5 -15 6z" fill={LIME} />
      {/* Raumschiff */}
      <g transform="translate(232 104) rotate(6)">
        <path d="M-6 16 L-10 42 L0 34 L10 42 L6 16 Z" fill={ORANGE} />
        <path d="M-3 18 L-4 32 L0 28 L4 32 L3 18 Z" fill={LIME} />
        <path d="M-12 10 L-20 24" stroke={CREAM} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M12 10 L20 24" stroke={CREAM} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M0 -24 C 12 -18 14 -2 13 14 L-13 14 C -14 -2 -12 -18 0 -24 Z" fill={PINK} stroke={INK} strokeWidth="3.5" />
        <circle cx="0" cy="-6" r="5.5" fill={CREAM} stroke={INK} strokeWidth="3" />
      </g>
      {/* Anzeigen */}
      <g transform="translate(20 196)">
        <text x="0" y="0" fontFamily="Bricolage Grotesque Variable, sans-serif" fontSize="12" fontWeight="800" fill={CREAM} letterSpacing="1.5">
          TREIBSTOFF
        </text>
        <rect x="0" y="8" width="96" height="14" rx="7" fill="none" stroke={CREAM} strokeWidth="3" />
        <rect x="4" y="12" width="20" height="6" rx="3" fill={ORANGE} />
        <text x="0" y="48" fontFamily="DM Mono, monospace" fontSize="22" fill={LIME}>
          4,2 m/s
        </text>
      </g>
    </svg>
  )
}

/** Falscher Ton: Das Wesen singt – ein Balken tanzt aus der Reihe. */
export function TonArt() {
  const bars = [52, 88, 64, 108, 76]
  return (
    <svg viewBox="0 0 560 230" role="img" aria-label="Ein kleines rundes Wesen singt; daneben fünf Tonbalken, einer davon ist pink markiert">
      <defs>
        <pattern id="ton-dots" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.5" fill={INK} opacity="0.16" />
        </pattern>
      </defs>
      <rect width="560" height="230" fill="url(#ton-dots)" />
      {/* Bühne */}
      <ellipse cx="128" cy="206" rx="96" ry="14" fill={INK} opacity="0.2" />
      {/* Wesen */}
      <g transform="translate(128 128)">
        <path d="M-30 68 q-4 12 -18 12 M30 68 q4 12 18 12" stroke={INK} strokeWidth="6" strokeLinecap="round" fill="none" />
        <path d="M0 -78 C 52 -78 78 -40 78 4 C 78 50 44 74 0 74 C -44 74 -78 50 -78 4 C -78 -40 -52 -78 0 -78 Z" fill={PINK} stroke={INK} strokeWidth="5" />
        <path d="M-10 -78 q-6 -22 10 -30 q-2 16 8 28" fill={ORANGE} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <ellipse cx="-26" cy="-16" rx="13" ry="16" fill={CREAM} stroke={INK} strokeWidth="4" />
        <ellipse cx="26" cy="-16" rx="13" ry="16" fill={CREAM} stroke={INK} strokeWidth="4" />
        <circle cx="-22" cy="-12" r="6.5" fill={INK} />
        <circle cx="30" cy="-12" r="6.5" fill={INK} />
        <ellipse cx="0" cy="26" rx="20" ry="24" fill={INK} />
        <ellipse cx="0" cy="38" rx="11" ry="8" fill={ORANGE} />
        <circle cx="-50" cy="14" r="8" fill={ORANGE} opacity="0.55" />
        <circle cx="50" cy="14" r="8" fill={ORANGE} opacity="0.55" />
      </g>
      {/* Noten */}
      <g fill={INK}>
        <path d="M222 54 v-34 l22 -6 v30" stroke={INK} strokeWidth="4" fill="none" />
        <ellipse cx="217" cy="56" rx="8" ry="6" />
        <ellipse cx="239" cy="46" rx="8" ry="6" />
        <path d="M190 104 v-28" stroke={INK} strokeWidth="4" />
        <ellipse cx="185" cy="106" rx="8" ry="6" />
      </g>
      {/* Balken */}
      <g transform="translate(290 34)">
        {bars.map((h, i) => {
          const odd = i === 3
          return (
            <g key={i} transform={`translate(${i * 52} 0)`}>
              <rect x="0" y="0" width="42" height="150" rx="10" fill={odd ? CREAM : 'rgba(12,22,80,0.08)'} stroke={INK} strokeWidth="4" />
              <rect x="7" y={150 - h - 7 + 7} width="28" height={h - 7} rx="6" fill={odd ? PINK : INK} />
              <text x="21" y="174" textAnchor="middle" fontFamily="DM Mono, monospace" fontSize="16" fill={INK}>
                {i + 1}
              </text>
            </g>
          )
        })}
        <g transform="translate(177 -6)">
          <circle r="17" fill={ORANGE} stroke={INK} strokeWidth="4" />
          <text y="7" textAnchor="middle" fontFamily="Bricolage Grotesque Variable, sans-serif" fontSize="22" fontWeight="800" fill={INK}>
            ?
          </text>
        </g>
        {/* Fingertipp */}
        <circle cx="177" cy="110" r="24" fill="none" stroke={INK} strokeWidth="3" strokeDasharray="3 6" />
      </g>
    </svg>
  )
}
