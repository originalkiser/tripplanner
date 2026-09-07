// Amusement park hero scene — see the comment atop MountainScene.tsx for
// why this uses a single "slice"-fit viewBox instead of beach's three-tier
// approach.
const WHEEL_CX = 100
const WHEEL_CY = 26
const WHEEL_R = 16
const SPOKE_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315]
const CAR_COLORS = ['#e8556b', '#f2a541', '#4fae6b', '#4b8fd6', '#e8556b', '#f2a541', '#4fae6b', '#4b8fd6']

function FerrisWheel({ lit }: { lit?: boolean }) {
  return (
    <g>
      {/* support legs */}
      <path
        d={`M${WHEEL_CX},${WHEEL_CY + WHEEL_R} L${WHEEL_CX - 10},50 M${WHEEL_CX},${WHEEL_CY + WHEEL_R} L${WHEEL_CX + 10},50`}
        stroke={lit ? '#5a4a6a' : '#8a7a5a'}
        strokeWidth="1.5"
        fill="none"
      />
      <g className="scene-ferris-wheel" style={{ transformOrigin: `${WHEEL_CX}px ${WHEEL_CY}px` }}>
        <circle cx={WHEEL_CX} cy={WHEEL_CY} r={WHEEL_R} fill="none" stroke={lit ? '#caa8e6' : '#7a6a52'} strokeWidth="1.5" />
        {SPOKE_ANGLES.map((deg, i) => {
          const rad = (deg * Math.PI) / 180
          const x = WHEEL_CX + WHEEL_R * Math.cos(rad)
          const y = WHEEL_CY + WHEEL_R * Math.sin(rad)
          return (
            <line
              key={i}
              x1={WHEEL_CX}
              y1={WHEEL_CY}
              x2={x}
              y2={y}
              stroke={lit ? '#caa8e6' : '#7a6a52'}
              strokeWidth="0.75"
            />
          )
        })}
        {SPOKE_ANGLES.map((deg, i) => {
          const rad = (deg * Math.PI) / 180
          const x = WHEEL_CX + WHEEL_R * Math.cos(rad)
          const y = WHEEL_CY + WHEEL_R * Math.sin(rad)
          return <circle key={i} cx={x} cy={y} r={2} fill={CAR_COLORS[i]} />
        })}
      </g>
    </g>
  )
}

function Coaster({ stroke }: { stroke: string }) {
  return (
    <g>
      <path
        d="M230,50 L230,32 Q238,20 246,32 Q254,44 262,32 Q270,20 278,32 L286,50"
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M230,50 L230,38 M286,50 L286,38 M258,50 L258,30" stroke={stroke} strokeWidth="1" opacity="0.6" />
    </g>
  )
}

function Tent({ x, colors }: { x: number; colors: [string, string] }) {
  return (
    <g transform={`translate(${x},50)`}>
      <path d="M-9,0 L0,-14 L9,0 Z" fill={colors[0]} />
      <path d="M-4.5,0 L0,-7 L4.5,0 Z" fill={colors[1]} />
      <line x1="0" y1="-14" x2="0" y2="-18" stroke="#6b5a4a" strokeWidth="1" />
      <path d="M0,-18 L5,-16 L0,-14 Z" fill="#e8556b" />
    </g>
  )
}

export function AmusementParkScene() {
  return (
    <div className="scene-fixed">
      <div className="scene-bg scene-day">
        <div className="scene-sky-park-day" />
        <div className="scene-ground-park-day" />
      </div>
      <div className="scene-bg scene-night">
        <div className="scene-sky-park-night" />
        <div className="scene-ground-park-night" />
      </div>

      <svg
        className="scene-content"
        viewBox="0 0 400 72"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g className="scene-visibility scene-day">
          <circle className="scene-sun" cx="345" cy="14" r="7" fill="#f6b857" />

          <g className="scene-cloud scene-cloud-a" fill="#ffffff" opacity="0.8">
            <ellipse cx="185" cy="12" rx="12" ry="4.5" />
            <ellipse cx="193" cy="10" rx="8" ry="4" />
          </g>

          <FerrisWheel />
          <Coaster stroke="#4b8fd6" />
          <Tent x={330} colors={['#e8556b', '#f6e6d8']} />
          <Tent x={355} colors={['#4fae6b', '#f6e6d8']} />
        </g>

        <g className="scene-visibility scene-night">
          <g fill="#eaf2f3">
            {STAR_POSITIONS.map(([sx, sy, r], i) => (
              <circle
                key={i}
                className="scene-star"
                cx={sx}
                cy={sy}
                r={r}
                style={{ animationDelay: `${(i * 0.7) % 4}s`, animationDuration: `${3 + (i % 4)}s` }}
              />
            ))}
          </g>

          <circle className="scene-sun" cx="345" cy="13" r="6" fill="#eaf2f3" />
          <circle cx="343" cy="11" r="6" fill="#2a0f3d" opacity="0.55" />

          <FerrisWheel lit />
          <Coaster stroke="#8a6ab0" />
          <Tent x={330} colors={['#8a3a52', '#3a2a4a']} />
          <Tent x={355} colors={['#2f6a4a', '#3a2a4a']} />
        </g>
      </svg>
    </div>
  )
}

const STAR_POSITIONS: Array<[number, number, number]> = [
  [56, 9, 1],
  [150, 16, 0.8],
  [212, 7, 1.1],
  [24, 22, 0.9],
  [298, 10, 0.9],
  [44, 8, 0.7],
  [153, 30, 0.9],
]
