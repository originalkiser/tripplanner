// Beach scene backdrop, fixed to the top of the viewport so it never scrolls
// away: sky, a horizon line, water, a couple of palm trees, and a glowing sun
// or moon. Day/night swap is pure CSS (.scene-day / .scene-night, mirroring
// the same data-theme / prefers-color-scheme rules that drive the color
// palette in index.css) so it stays in sync with light/dark mode without any
// JS theme-tracking of its own.
//
// preserveAspectRatio="none" (stretch to exactly fill width and height,
// independently) is deliberate: this banner's container is a fixed CSS
// height but its width can be anything from a phone to a wide desktop
// window, and a uniform-scaling "slice"/"meet" fit only covers that whole
// range acceptably within a narrow band of aspect ratios. On a wide-but-
// short desktop window, "slice" scales up to cover the width and crops
// almost everything above the waterline, leaving what looks like a blank
// strip. Stretching trades a little horizontal distortion (barely visible
// for a shallow decorative strip like this) for guaranteed full vertical
// visibility at every width.
export function HeroScene() {
  return (
    <div className="scene-fixed">
      <svg
        className="scene-day h-full w-full"
        viewBox="0 0 420 72"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="sky-day" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fdf1de" />
            <stop offset="100%" stopColor="#fbdfb0" />
          </linearGradient>
          <linearGradient id="water-day" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7fc8c9" />
            <stop offset="100%" stopColor="#2d5d7b" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="420" height="50" fill="url(#sky-day)" />
        <circle className="scene-sun" cx="340" cy="16" r="7" fill="#f6b857" />

        <g className="scene-cloud scene-cloud-a" fill="#ffffff" opacity="0.8">
          <ellipse cx="90" cy="16" rx="13" ry="5" />
          <ellipse cx="102" cy="14" rx="9" ry="4.5" />
          <ellipse cx="78" cy="14.5" rx="8" ry="4" />
        </g>
        <g className="scene-cloud scene-cloud-b" fill="#ffffff" opacity="0.7">
          <ellipse cx="220" cy="27" rx="10" ry="4" />
          <ellipse cx="229" cy="25" rx="7" ry="3.5" />
        </g>

        <rect x="0" y="50" width="420" height="22" fill="url(#water-day)" />
        <rect x="0" y="48.5" width="420" height="1.5" fill="#fbdfb0" opacity="0.6" />

        <Palm x={38} baseY={50} height={26} trunk="#6b4a2b" fronds={['#2f6b4f', '#357a59']} />
        <Palm x={396} baseY={50} height={21} trunk="#6b4a2b" fronds={['#357a59', '#2f6b4f']} mirror />
      </svg>

      <svg
        className="scene-night h-full w-full"
        viewBox="0 0 420 72"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="sky-night" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a1a20" />
            <stop offset="100%" stopColor="#16323d" />
          </linearGradient>
          <linearGradient id="water-night" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#123038" />
            <stop offset="100%" stopColor="#0a1a20" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="420" height="50" fill="url(#sky-night)" />

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

        <circle className="scene-sun" cx="340" cy="14" r="6" fill="#eaf2f3" />
        <circle cx="337" cy="12" r="6" fill="#0a1a20" opacity="0.55" />

        <rect x="0" y="50" width="420" height="22" fill="url(#water-night)" />
        <rect x="0" y="48.5" width="420" height="1.5" fill="#234450" opacity="0.8" />

        <Palm x={38} baseY={50} height={26} trunk="#0a1e24" fronds={['#123038', '#173a44']} />
        <Palm x={396} baseY={50} height={21} trunk="#0a1e24" fronds={['#173a44', '#123038']} mirror />
      </svg>
    </div>
  )
}

const STAR_POSITIONS: Array<[number, number, number]> = [
  [70, 9, 1],
  [140, 16, 0.8],
  [220, 7, 1.1],
  [270, 19, 0.8],
  [25, 22, 0.9],
  [180, 24, 0.8],
  [305, 10, 0.9],
  [45, 8, 0.7],
  [250, 33, 0.7],
  [155, 30, 0.9],
]

interface PalmProps {
  x: number
  baseY: number
  height: number
  trunk: string
  fronds: [string, string]
  mirror?: boolean
}

// Fan-crown palm: a curved trunk planted at the waterline, topped by seven
// filled leaf blades radiating out like a fan, sized relative to `height`
// so shorter trees get proportionally shorter fronds instead of a crown
// that overshoots the trunk (and the top of the scene). The frond crown is
// placed by an SVG `transform` attribute on a plain wrapper `<g>`; the sway
// animation lives on an *inner* `<g>` with no attribute transform of its
// own, because a CSS `transform` (from the keyframe animation) replaces
// rather than composes with an element's SVG `transform` attribute —
// putting both on the same node silently discards the positioning
// translate. The sway's `transform-origin` is set in plain SVG user units
// (not a percentage) so it pivots at this group's own local (0,0) — the
// trunk-top attachment point — instead of a corner of the frond blades'
// combined bounding box, which is offset from that point and made the sway
// look like a sideways slide instead of a clean rotation.
function Palm({ x, baseY, height, trunk, fronds, mirror }: PalmProps) {
  const dir = mirror ? -1 : 1
  const topY = -height
  const frondLen = height * 0.7
  const wOuter = frondLen * 0.1
  const wInner = frondLen * 0.05
  const angles = [-100, -65, -30, -5, 20, 55, 90].map((a) => a * dir)

  return (
    <g className="scene-palm" transform={`translate(${x},${baseY})`}>
      <path
        d={`M0,0 C${2 * dir},${topY * 0.35} ${-3 * dir},${topY * 0.7} ${2 * dir},${topY}`}
        stroke={trunk}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <g transform={`translate(${2 * dir},${topY})`}>
        <g className="scene-fronds">
          {angles.map((deg, i) => {
            const tip = frondLen + (i % 3) * frondLen * 0.1
            const mid = tip * 0.82
            const near = tip * 0.38
            return (
              <path
                key={i}
                transform={`rotate(${deg})`}
                d={`M0,0 C-${wOuter},-${near} -${wInner},-${mid} 0,-${tip} C${wInner},-${mid} ${wOuter},-${near} 0,0 Z`}
                fill={fronds[i % 2]}
              />
            )
          })}
        </g>
      </g>
    </g>
  )
}
