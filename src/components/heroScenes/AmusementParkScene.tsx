// Amusement park hero scene — see the comment atop MountainScene.tsx for
// why this uses a single "slice"-fit viewBox instead of beach's three-tier
// approach.
const WHEEL_CX = 96
const WHEEL_CY = 24
const WHEEL_R = 15
const SPOKE_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315]
const CAR_COLORS_DAY = ['#e8556b', '#f2a541', '#4fae6b', '#4b8fd6', '#e8556b', '#f2a541', '#4fae6b', '#4b8fd6']
const CAR_COLORS_NIGHT = ['#f2a541', '#caa8e6', '#f6c667', '#4b8fd6', '#f2a541', '#caa8e6', '#f6c667', '#4b8fd6']

function FerrisWheel({ lit }: { lit?: boolean }) {
  const carColors = lit ? CAR_COLORS_NIGHT : CAR_COLORS_DAY
  return (
    <g>
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
          return <circle key={i} cx={x} cy={y} r={2} fill={carColors[i]} />
        })}
      </g>
    </g>
  )
}

function Coaster({ stroke }: { stroke: string }) {
  return (
    <g>
      <path
        d="M226,50 L226,32 Q234,20 242,32 Q250,44 258,32 Q266,20 274,32 L282,50"
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M226,50 L226,38 M282,50 L282,38 M254,50 L254,30" stroke={stroke} strokeWidth="1" opacity="0.6" />
    </g>
  )
}

// A striped conical roof (alternating color wedges from the apex, like a
// circus-tent canopy) over three support poles, a small platform, and a
// scatter of oval "carousel animal" silhouettes between the poles.
function Carousel({ roofColors, poleColor, animalColor }: { roofColors: [string, string]; poleColor: string; animalColor: string }) {
  const cx = 186
  const baseY = 50
  const roofApexY = baseY - 27
  const roofBaseY = baseY - 21
  const roofHalfWidth = 17
  const wedgeCount = 6
  const wedgeXs = Array.from({ length: wedgeCount + 1 }, (_, i) => cx - roofHalfWidth + (i * (roofHalfWidth * 2)) / wedgeCount)
  const platformY = baseY - 2

  return (
    <g>
      <ellipse cx={cx} cy={platformY + 1} rx={19} ry={2.5} fill={poleColor} opacity="0.5" />

      {wedgeXs.slice(0, -1).map((x, i) => (
        <path
          key={i}
          d={`M${cx},${roofApexY} L${wedgeXs[i + 1]},${roofBaseY} L${x},${roofBaseY} Z`}
          fill={i % 2 === 0 ? roofColors[0] : roofColors[1]}
        />
      ))}
      <circle cx={cx} cy={roofApexY - 1.5} r={1.4} fill={roofColors[0]} />

      {[-11, 0, 11].map((dx, i) => (
        <line key={i} x1={cx + dx} y1={roofBaseY} x2={cx + dx} y2={platformY} stroke={poleColor} strokeWidth="1" />
      ))}

      {[-6.5, 5.5].map((dx, i) => (
        <g key={i} transform={`translate(${cx + dx},${platformY - (i === 0 ? 5 : 2)})`}>
          <line x1={0} y1={2.2} x2={0} y2={6} stroke={poleColor} strokeWidth="0.6" />
          <ellipse cx={0} cy={0} rx={4.5} ry={2.4} fill={animalColor} />
          <circle cx={4.6} cy={-1.6} r={1.6} fill={animalColor} />
        </g>
      ))}
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

// A simple game-booth silhouette: a box with a striped awning, standing in
// for the concession/game stalls that line an actual midway.
function Booth({ x, awning, box }: { x: number; awning: string; box: string }) {
  return (
    <g transform={`translate(${x},50)`}>
      <rect x={-8} y={-11} width={16} height={11} fill={box} />
      <path d="M-10,-11 L10,-11 L8,-15 L-8,-15 Z" fill={awning} />
      {[-8, -3.3, 1.3, 6].map((sx, i) => (
        <path key={i} d={`M${sx},-15 L${sx + 4.6},-15 L${sx + 4.6 - 1},-11.3 L${sx + 1},-11.3 Z`} fill={i % 2 === 0 ? '#f6e6d8' : awning} opacity="0.85" />
      ))}
    </g>
  )
}

// Pennant garland strung between poles across the top of the scene — a
// shallow quadratic sag between anchor points, with small triangular flags
// hanging at intervals along each sag.
function Bunting({ colors }: { colors: string[] }) {
  const anchors = [-10, 90, 190, 290, 400]
  const sagY = 9
  const topY = 3
  const flags: Array<[number, number]> = []
  for (let seg = 0; seg < anchors.length - 1; seg++) {
    const x0 = anchors[seg]
    const x1 = anchors[seg + 1]
    for (let t = 0.12; t < 1; t += 0.16) {
      const x = x0 + (x1 - x0) * t
      const y = topY + (sagY - topY) * 4 * t * (1 - t)
      flags.push([x, y])
    }
  }
  return (
    <g>
      {anchors.slice(0, -1).map((x0, i) => (
        <path
          key={i}
          d={`M${x0},${topY} Q${(x0 + anchors[i + 1]) / 2},${sagY} ${anchors[i + 1]},${topY}`}
          fill="none"
          stroke="#8a7a5a"
          strokeWidth="0.5"
          opacity="0.6"
        />
      ))}
      {flags.map(([x, y], i) => (
        <path key={i} d={`M${x - 2},${y} L${x + 2},${y} L${x},${y + 4} Z`} fill={colors[i % colors.length]} />
      ))}
    </g>
  )
}

function Balloon({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <path d="M0,4 Q-5,20 0,26" fill="none" stroke="#8a7a5a" strokeWidth="0.4" opacity="0.7" />
      <ellipse cx={0} cy={0} rx={4} ry={5} fill={color} />
      <path d="M-1.2,4.6 L1.2,4.6 L0,6.2 Z" fill={color} />
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

          <Booth x={22} awning="#4b8fd6" box="#f6e6d8" />
          <Booth x={52} awning="#e8556b" box="#f6e6d8" />

          <FerrisWheel />
          <Carousel roofColors={['#e8556b', '#f6e6d8']} poleColor="#6b5a4a" animalColor="#f2a541" />
          <Coaster stroke="#4b8fd6" />

          <Tent x={318} colors={['#e8556b', '#f6e6d8']} />
          <Tent x={344} colors={['#4fae6b', '#f6e6d8']} />
          <Booth x={374} awning="#f2a541" box="#f6e6d8" />

          <Balloon x={132} y={14} color="#e8556b" />
          <Balloon x={140} y={22} color="#4b8fd6" />
          <Balloon x={302} y={16} color="#f2a541" />

          <Bunting colors={['#e8556b', '#f2a541', '#4fae6b', '#4b8fd6']} />
        </g>

        <g className="scene-visibility scene-night">
          <g fill="#e9ddfb">
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

          <circle className="scene-sun" cx="345" cy="13" r="6" fill="#e9ddfb" />
          <circle cx="343" cy="11" r="6" fill="#241338" opacity="0.55" />

          <Booth x={22} awning="#8a3a52" box="#3a2a4a" />
          <Booth x={52} awning="#5a3a7a" box="#3a2a4a" />

          <FerrisWheel lit />
          <Carousel roofColors={['#8a3a7a', '#caa8e6']} poleColor="#4a3a5e" animalColor="#f6c667" />
          <Coaster stroke="#8a6ab0" />

          <Tent x={318} colors={['#8a3a52', '#3a2a4a']} />
          <Tent x={344} colors={['#2f6a4a', '#3a2a4a']} />
          <Booth x={374} awning="#caa8e6" box="#3a2a4a" />

          <Balloon x={132} y={14} color="#caa8e6" />
          <Balloon x={140} y={22} color="#f6c667" />
          <Balloon x={302} y={16} color="#8a6ab0" />

          <Bunting colors={['#caa8e6', '#f6c667', '#8a6ab0', '#e8556b']} />
        </g>
      </svg>
    </div>
  )
}

const STAR_POSITIONS: Array<[number, number, number]> = [
  [56, 9, 1],
  [150, 6, 0.8],
  [212, 7, 1.1],
  [24, 22, 0.9],
  [298, 10, 0.9],
  [44, 8, 0.7],
  [153, 30, 0.9],
  [270, 6, 0.8],
  [400, 20, 0.8],
]
