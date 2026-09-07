// City hero scene — see the comment atop MountainScene.tsx for why this
// uses a single "slice"-fit viewBox instead of beach's three-tier approach.
interface Building {
  x: number
  width: number
  height: number
}

// Roughly back-to-front by height (taller ones read as further back), left
// to right. Coordinates in the 400x72 viewBox, sitting on the y=50 horizon.
const BUILDINGS: Building[] = [
  { x: 10, width: 28, height: 22 },
  { x: 42, width: 20, height: 32 },
  { x: 66, width: 24, height: 16 },
  { x: 96, width: 22, height: 38 },
  { x: 124, width: 18, height: 24 },
  { x: 150, width: 26, height: 30 },
  { x: 182, width: 20, height: 20 },
  { x: 210, width: 24, height: 40 },
  { x: 240, width: 20, height: 26 },
  { x: 266, width: 28, height: 18 },
  { x: 300, width: 22, height: 34 },
  { x: 328, width: 20, height: 22 },
  { x: 354, width: 26, height: 28 },
]

const WINDOW_W = 2.4
const WINDOW_H = 2.4
const WINDOW_GAP = 1.6
const STEP = WINDOW_W + WINDOW_GAP

// Deterministic PRNG (mulberry32) so each building's lit-window pattern is
// stable across re-renders instead of reshuffling every time React repaints.
function mulberry32(seed: number) {
  let s = seed
  return function () {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Every window cell that fits inside the building, top-to-bottom/left-to-right.
function windowGrid(b: Building): Array<[number, number]> {
  const cols = Math.max(1, Math.floor((b.width - 5) / STEP))
  const rows = Math.max(1, Math.floor((b.height - 7) / STEP))
  const cells: Array<[number, number]> = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) cells.push([row, col])
  }
  return cells
}

function windowPos(b: Building, row: number, col: number): [number, number] {
  return [b.x + 2.5 + col * STEP, 50 - b.height + 4.5 + row * STEP]
}

function BuildingShape({ b, fill }: { b: Building; fill: string }) {
  return <rect x={b.x} y={50 - b.height} width={b.width} height={b.height} fill={fill} />
}

// Day-mode buildings get the full window grid rendered as a faint grid of
// panes (unlit glass, not glowing) so they read as buildings even in daylight
// instead of flat color blocks.
function DayWindows({ b, index }: { b: Building; index: number }) {
  const fill = index % 2 === 0 ? '#3f4658' : '#333a4a'
  return (
    <>
      {windowGrid(b).map(([row, col], i) => {
        const [wx, wy] = windowPos(b, row, col)
        return <rect key={i} x={wx} y={wy} width={WINDOW_W} height={WINDOW_H} fill={fill} opacity="0.6" />
      })}
    </>
  )
}

// Night-mode buildings light a majority of their windows (denser than day's
// full-but-dim grid reads, since lit panes pop against the dark fill) with a
// handful of cooler blue-white panes mixed into the warm glow for variety.
function NightWindows({ b, index }: { b: Building; index: number }) {
  const rand = mulberry32(index * 97 + 13)
  const cells = windowGrid(b).filter(() => rand() < 0.65)
  return (
    <>
      {cells.map(([row, col], i) => {
        const [wx, wy] = windowPos(b, row, col)
        const cool = (row + col + index) % 6 === 0
        return (
          <rect key={i} x={wx} y={wy} width={WINDOW_W} height={WINDOW_H} fill={cool ? '#bfe3f0' : '#f6c667'} />
        )
      })}
    </>
  )
}

export function CityScene() {
  return (
    <div className="scene-fixed">
      <div className="scene-bg scene-day">
        <div className="scene-sky-city-day" />
        <div className="scene-ground-city-day" />
      </div>
      <div className="scene-bg scene-night">
        <div className="scene-sky-city-night" />
        <div className="scene-ground-city-night" />
      </div>

      <svg
        className="scene-content"
        viewBox="0 0 400 72"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g className="scene-visibility scene-day">
          <circle className="scene-sun" cx="40" cy="16" r="7" fill="#f6b857" />

          <g className="scene-cloud scene-cloud-a" fill="#ffffff" opacity="0.7">
            <ellipse cx="150" cy="12" rx="13" ry="4.5" />
            <ellipse cx="160" cy="10" rx="8" ry="4" />
          </g>
          <g className="scene-cloud scene-cloud-b" fill="#ffffff" opacity="0.6">
            <ellipse cx="270" cy="18" rx="10" ry="4" />
          </g>

          {BUILDINGS.map((b, i) => (
            <g key={i}>
              <BuildingShape b={b} fill={i % 2 === 0 ? '#5b6270' : '#495062'} />
              <DayWindows b={b} index={i} />
            </g>
          ))}
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

          <circle className="scene-sun" cx="40" cy="15" r="6" fill="#e9ddfb" />
          <circle cx="38" cy="13" r="6" fill="#1c1230" opacity="0.55" />

          {BUILDINGS.map((b, i) => (
            <g key={i}>
              <BuildingShape b={b} fill={i % 2 === 0 ? '#14101f' : '#1b1628' } />
              <NightWindows b={b} index={i} />
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}

const STAR_POSITIONS: Array<[number, number, number]> = [
  [56, 9, 1],
  [132, 12, 0.8],
  [212, 6, 1.1],
  [278, 14, 0.8],
  [24, 18, 0.9],
  [172, 20, 0.8],
  [340, 8, 0.9],
  [96, 6, 0.7],
  [378, 16, 0.7],
]
