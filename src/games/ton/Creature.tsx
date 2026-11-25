// „Pip“ – das kleine Wesen, das die Melodien singt.

interface Props {
  /** null = still, sonst 0..1 Tonhöhe */
  singing: number | null
  mood: 'idle' | 'listen' | 'happy' | 'sad'
}

export function Creature({ singing, mood }: Props) {
  const open = singing !== null
  const lift = open ? -6 - singing * 14 : 0
  const squash = open ? 1 + singing * 0.06 : 1
  return (
    <svg className={`pip pip-${mood}${open ? ' is-singing' : ''}`} viewBox="0 0 220 220" aria-hidden="true">
      <ellipse cx="110" cy="204" rx={open ? 58 : 66} ry="9" fill="#0c1650" opacity="0.22" />
      <g style={{ transform: `translateY(${lift}px) scaleY(${squash})`, transformOrigin: '110px 200px', transition: 'transform 0.12s ease-out' }}>
        <path d="M80 186 q-4 14 -20 14 M140 186 q4 14 20 14" stroke="#0c1650" strokeWidth="7" strokeLinecap="round" fill="none" />
        <path
          d="M110 36 C 164 36 190 76 190 120 C 190 166 154 192 110 192 C 66 192 30 166 30 120 C 30 76 56 36 110 36 Z"
          fill="#ff4f93"
          stroke="#0c1650"
          strokeWidth="6"
        />
        <path d="M100 38 q-8 -24 10 -32 q-3 18 9 31" fill="#ff7b22" stroke="#0c1650" strokeWidth="5" strokeLinejoin="round" />
        {/* Augen */}
        {mood === 'happy' ? (
          <g stroke="#0c1650" strokeWidth="6" strokeLinecap="round" fill="none">
            <path d="M70 98 q14 -16 28 0" />
            <path d="M122 98 q14 -16 28 0" />
          </g>
        ) : (
          <g>
            <ellipse cx="84" cy="98" rx="16" ry="19" fill="#f7eedb" stroke="#0c1650" strokeWidth="5" />
            <ellipse cx="136" cy="98" rx="16" ry="19" fill="#f7eedb" stroke="#0c1650" strokeWidth="5" />
            <circle cx={mood === 'listen' ? 90 : 88} cy={mood === 'sad' ? 106 : 102} r="7.5" fill="#0c1650" />
            <circle cx={mood === 'listen' ? 142 : 140} cy={mood === 'sad' ? 106 : 102} r="7.5" fill="#0c1650" />
          </g>
        )}
        {mood === 'sad' && <path d="M168 70 q8 12 0 18 q-8 -6 0 -18z" fill="#c4f23a" stroke="#0c1650" strokeWidth="3" />}
        {/* Mund */}
        {open ? (
          <g>
            <ellipse cx="110" cy="146" rx={14 + (singing ?? 0) * 6} ry={14 + (singing ?? 0) * 12} fill="#0c1650" />
            <ellipse cx="110" cy={154 + (singing ?? 0) * 8} rx="8" ry="5" fill="#ff7b22" />
          </g>
        ) : mood === 'happy' ? (
          <path d="M88 138 q22 26 44 0 z" fill="#0c1650" />
        ) : mood === 'sad' ? (
          <path d="M92 152 q18 -14 36 0" stroke="#0c1650" strokeWidth="6" fill="none" strokeLinecap="round" />
        ) : (
          <path d="M96 144 q14 10 28 0" stroke="#0c1650" strokeWidth="6" fill="none" strokeLinecap="round" />
        )}
        <circle cx="60" cy="130" r="10" fill="#ff7b22" opacity="0.55" />
        <circle cx="160" cy="130" r="10" fill="#ff7b22" opacity="0.55" />
      </g>
      {open && (
        <g className="pip-note" fill="#0c1650">
          <path d="M184 60 v-26 l16 -4 v22" stroke="#0c1650" strokeWidth="4" fill="none" />
          <ellipse cx="180" cy="62" rx="7" ry="5" />
          <ellipse cx="196" cy="54" rx="7" ry="5" />
        </g>
      )}
    </svg>
  )
}
