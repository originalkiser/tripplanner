// Mountain hero scene — sibling to BeachScene, chosen per-trip (see
// HeroScene.tsx). Deliberately simpler than the beach scene's three-tier
// hand-tuned viewBox approach: a single viewBox with
// preserveAspectRatio="xMidYMid slice" (cover/crop, not contain) fills the
// strip edge-to-edge at any width with no letterboxing math to get right.
// The tradeoff is that content can crop at extreme aspect ratios instead of
// every element having a guaranteed exact position — reasonable for a new
// theme with no tuning history yet, not worth it for beach's proven scene.
// Horizon sits at y=50 of a 72-tall viewBox (69.44%), matching the
// .scene-sky/.scene-ground flex split in index.css exactly.
type Pt = [number, number]

// Both ranges are plain ridgelines (left edge → alternating peak/valley →
// right edge → down to the horizon → back to the start). Snow caps are
// derived from this same data (see snowCaps below) instead of being
// separately hand-placed triangles, so they're geometrically guaranteed to
// sit exactly on the ridge's own slope instead of just approximating it.
const BACK_RIDGE: Pt[] = [
  [-10, 42],
  [30, 20],
  [70, 34],
  [120, 12],
  [170, 32],
  [220, 17],
  [270, 36],
  [320, 22],
  [400, 40],
  [400, 50],
  [-10, 50],
]

const FRONT_RIDGE: Pt[] = [
  [-10, 50],
  [25, 26],
  [65, 44],
  [105, 16],
  [145, 40],
  [195, 21],
  [245, 46],
  [295, 29],
  [345, 47],
  [400, 34],
  [400, 50],
  [-10, 50],
]

function ridgePath(points: Pt[]): string {
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ') + ' Z'
}

// A peak is any interior ridge point lower (smaller y) than both its
// neighbors. The cap triangle's two base corners are linear-interpolated
// along the peak's own two edges by a fixed vertical drop, so they land
// exactly on the ridge line rather than at independently-guessed
// coordinates that can drift off the slope.
function snowCaps(points: Pt[], drop: number): string[] {
  const caps: string[] = []
  for (let i = 1; i <= points.length - 3; i++) {
    const [px, py] = points[i]
    const [lx, ly] = points[i - 1]
    const [rx, ry] = points[i + 1]
    if (py < ly && py < ry) {
      const tL = Math.min(drop / (ly - py), 1)
      const tR = Math.min(drop / (ry - py), 1)
      const lx2 = px + (lx - px) * tL
      const ly2 = py + (ly - py) * tL
      const rx2 = px + (rx - px) * tR
      const ry2 = py + (ry - py) * tR
      caps.push(`M${px},${py} L${rx2},${ry2} L${lx2},${ly2} Z`)
    }
  }
  return caps
}

const FRONT_SNOW_CAPS = snowCaps(FRONT_RIDGE, 9)

export function MountainScene() {
  return (
    <div className="scene-fixed">
      <div className="scene-bg scene-day">
        <div className="scene-sky-mountain-day" />
        <div className="scene-ground-mountain-day" />
      </div>
      <div className="scene-bg scene-night">
        <div className="scene-sky-mountain-night" />
        <div className="scene-ground-mountain-night" />
      </div>

      <svg
        className="scene-content"
        viewBox="0 0 400 72"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g className="scene-visibility scene-day">
          <circle className="scene-sun" cx="345" cy="14" r="7" fill="#f6b857" />

          <g className="scene-cloud scene-cloud-a" fill="#ffffff" opacity="0.75">
            <ellipse cx="90" cy="13" rx="12" ry="4.5" />
            <ellipse cx="98" cy="11" rx="8" ry="4" />
          </g>

          <path d={ridgePath(BACK_RIDGE)} fill="#b9cfd6" opacity="0.75" />
          <path d={ridgePath(FRONT_RIDGE)} fill="#6f8f6a" />
          {FRONT_SNOW_CAPS.map((d, i) => (
            <path key={i} d={d} fill="#f4f8f7" />
          ))}

          <Pine x={355} baseY={50} height={16} />
          <Pine x={372} baseY={50} height={12} />
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
          <circle cx="343" cy="11" r="6" fill="#241735" opacity="0.55" />

          <path d={ridgePath(BACK_RIDGE)} fill="#4a3a63" opacity="0.75" />
          <path d={ridgePath(FRONT_RIDGE)} fill="#241d33" />
          {FRONT_SNOW_CAPS.map((d, i) => (
            <path key={i} d={d} fill="#8f7fb8" />
          ))}

          <Pine x={355} baseY={50} height={16} dark />
          <Pine x={372} baseY={50} height={12} dark />
        </g>
      </svg>
    </div>
  )
}

const STAR_POSITIONS: Array<[number, number, number]> = [
  [56, 9, 1],
  [132, 16, 0.8],
  [212, 7, 1.1],
  [258, 19, 0.8],
  [24, 22, 0.9],
  [172, 24, 0.8],
  [298, 10, 0.9],
  [44, 8, 0.7],
  [243, 33, 0.7],
  [153, 30, 0.9],
]

// A simple filled triangle crown over a short trunk — deliberately plain
// (no per-branch detail like the palm's fronds) since it only ever appears
// small, in the front corner of the scene.
function Pine({ x, baseY, height, dark }: { x: number; baseY: number; height: number; dark?: boolean }) {
  const trunk = dark ? '#1a1420' : '#4a3423'
  const fill = dark ? '#2f2645' : '#3a6b4f'
  return (
    <g transform={`translate(${x},${baseY})`}>
      <rect x={-1} y={-height * 0.25} width={2} height={height * 0.25} fill={trunk} />
      <path
        d={`M0,${-height} L${height * 0.32},${-height * 0.35} L${-height * 0.32},${-height * 0.35} Z`}
        fill={fill}
      />
      <path
        d={`M0,${-height * 0.7} L${height * 0.24},${-height * 0.2} L${-height * 0.24},${-height * 0.2} Z`}
        fill={fill}
      />
    </g>
  )
}
