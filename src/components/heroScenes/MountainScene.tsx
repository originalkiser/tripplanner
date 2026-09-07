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

          {/* Back range — hazy, distant */}
          <path
            d="M-10,42 L30,20 L70,34 L120,12 L170,32 L220,17 L270,36 L320,22 L400,40 L400,50 L-10,50 Z"
            fill="#b9cfd6"
            opacity="0.75"
          />

          {/* Front range — closer, darker, with snow caps */}
          <path
            d="M-10,50 L25,26 L65,44 L105,16 L145,40 L195,21 L245,46 L295,29 L345,47 L400,34 L400,50 L-10,50 Z"
            fill="#6f8f6a"
          />
          <path d="M105,16 L114,26 L96,26 Z" fill="#f4f8f7" />
          <path d="M195,21 L204,30 L186,30 Z" fill="#f4f8f7" />
          <path d="M25,26 L32,34 L18,34 Z" fill="#f4f8f7" />

          <Pine x={355} baseY={50} height={16} />
          <Pine x={372} baseY={50} height={12} />
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
          <circle cx="343" cy="11" r="6" fill="#0d1b2e" opacity="0.55" />

          <path
            d="M-10,42 L30,20 L70,34 L120,12 L170,32 L220,17 L270,36 L320,22 L400,40 L400,50 L-10,50 Z"
            fill="#243b4a"
            opacity="0.8"
          />
          <path
            d="M-10,50 L25,26 L65,44 L105,16 L145,40 L195,21 L245,46 L295,29 L345,47 L400,34 L400,50 L-10,50 Z"
            fill="#16232a"
          />
          <path d="M105,16 L114,26 L96,26 Z" fill="#3a4d55" />
          <path d="M195,21 L204,30 L186,30 Z" fill="#3a4d55" />
          <path d="M25,26 L32,34 L18,34 Z" fill="#3a4d55" />

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
  const trunk = dark ? '#1a1410' : '#4a3423'
  const fill = dark ? '#16302a' : '#3a6b4f'
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
