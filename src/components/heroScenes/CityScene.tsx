// City hero scene — see the comment atop MountainScene.tsx for why this
// uses a single "slice"-fit viewBox instead of beach's three-tier approach.
interface Building {
  x: number
  width: number
  height: number
  // Which window cells (row, col from the top-left of this building) are
  // lit at night — hand-picked per building rather than randomized so the
  // pattern is stable across renders instead of flickering into different
  // windows on every re-render.
  litWindows: Array<[number, number]>
}

// Roughly back-to-front by height (taller ones read as further back), left
// to right. Coordinates in the 400x72 viewBox, sitting on the y=50 horizon.
const BUILDINGS: Building[] = [
  { x: 10, width: 28, height: 22, litWindows: [[0, 0], [1, 1], [2, 0]] },
  { x: 42, width: 20, height: 32, litWindows: [[0, 0], [0, 1], [2, 1], [3, 0]] },
  { x: 66, width: 24, height: 16, litWindows: [[1, 0]] },
  { x: 96, width: 22, height: 38, litWindows: [[0, 1], [1, 0], [3, 1], [4, 0]] },
  { x: 124, width: 18, height: 24, litWindows: [[2, 0]] },
  { x: 150, width: 26, height: 30, litWindows: [[0, 0], [1, 1], [2, 0], [3, 1]] },
  { x: 182, width: 20, height: 20, litWindows: [[1, 1]] },
  { x: 210, width: 24, height: 40, litWindows: [[0, 0], [2, 1], [3, 0], [5, 1]] },
  { x: 240, width: 20, height: 26, litWindows: [[1, 0], [3, 1]] },
  { x: 266, width: 28, height: 18, litWindows: [[0, 1]] },
  { x: 300, width: 22, height: 34, litWindows: [[0, 0], [1, 1], [3, 0], [4, 1]] },
  { x: 328, width: 20, height: 22, litWindows: [[2, 0]] },
  { x: 354, width: 26, height: 28, litWindows: [[0, 1], [1, 0], [2, 1]] },
]

const WINDOW_W = 3
const WINDOW_H = 3
const WINDOW_GAP = 2

function BuildingShape({ b, fill }: { b: Building; fill: string }) {
  return <rect x={b.x} y={50 - b.height} width={b.width} height={b.height} fill={fill} />
}

function Windows({ b, color }: { b: Building; color: string }) {
  return (
    <>
      {b.litWindows.map(([row, col], i) => {
        const wx = b.x + 3 + col * (WINDOW_W + WINDOW_GAP)
        const wy = 50 - b.height + 4 + row * (WINDOW_H + WINDOW_GAP)
        if (wx + WINDOW_W > b.x + b.width - 2 || wy + WINDOW_H > 50 - 3) return null
        return <rect key={i} x={wx} y={wy} width={WINDOW_W} height={WINDOW_H} fill={color} />
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
            <BuildingShape key={i} b={b} fill={i % 2 === 0 ? '#5b6270' : '#495062'} />
          ))}
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

          <circle className="scene-sun" cx="40" cy="15" r="6" fill="#eaf2f3" />
          <circle cx="38" cy="13" r="6" fill="#170f2e" opacity="0.55" />

          {BUILDINGS.map((b, i) => (
            <g key={i}>
              <BuildingShape b={b} fill={i % 2 === 0 ? '#141420' : '#1c1c2a'} />
              <Windows b={b} color="#f6c667" />
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
