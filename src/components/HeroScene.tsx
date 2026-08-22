// Simple beach backdrop, fixed to the top of the viewport so it never
// scrolls away: a glowing sun or moon and a couple of palm trees, no
// water/horizon line. Day/night swap is pure CSS (.scene-day / .scene-night,
// mirroring the same data-theme / prefers-color-scheme rules that drive the
// color palette in index.css) so it stays in sync with light/dark mode
// without any JS theme-tracking of its own.
export function HeroScene() {
  return (
    <div className="scene-fixed">
      <svg
        className="scene-day h-full w-full"
        viewBox="0 0 420 100"
        preserveAspectRatio="xMidYMax slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle className="scene-sun" cx="340" cy="26" r="15" fill="#f6b857" />
        <Palm x={38} height={72} trunk="#6b4a2b" fronds={['#2f6b4f', '#357a59']} />
        <Palm x={396} height={60} trunk="#6b4a2b" fronds={['#357a59', '#2f6b4f']} mirror />
      </svg>

      <svg
        className="scene-night h-full w-full"
        viewBox="0 0 420 100"
        preserveAspectRatio="xMidYMax slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g fill="#eaf2f3" opacity="0.6">
          <circle cx="70" cy="16" r="1" />
          <circle cx="140" cy="30" r="0.8" />
          <circle cx="220" cy="12" r="1.1" />
          <circle cx="270" cy="34" r="0.8" />
          <circle cx="25" cy="40" r="0.9" />
          <circle cx="180" cy="44" r="0.8" />
        </g>
        <circle className="scene-sun" cx="340" cy="24" r="12" fill="#eaf2f3" />
        <circle cx="336" cy="21" r="12" fill="#0f2027" opacity="0.55" />
        <Palm x={38} height={72} trunk="#0a1e24" fronds={['#123038', '#173a44']} />
        <Palm x={396} height={60} trunk="#0a1e24" fronds={['#173a44', '#123038']} mirror />
      </svg>
    </div>
  )
}

interface PalmProps {
  x: number
  height: number
  trunk: string
  fronds: [string, string]
  mirror?: boolean
}

// Fan-crown palm: a curved trunk planted at the bottom of the scene, topped
// by seven filled leaf blades radiating out like a fan.
function Palm({ x, height, trunk, fronds, mirror }: PalmProps) {
  const dir = mirror ? -1 : 1
  const topY = -height
  const angles = [-100, -65, -30, -5, 20, 55, 90].map((a) => a * dir)

  return (
    <g className="scene-palm" transform={`translate(${x},100)`}>
      <path
        d={`M0,0 C${2 * dir},${topY * 0.35} ${-3 * dir},${topY * 0.7} ${2 * dir},${topY}`}
        stroke={trunk}
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      <g className="scene-fronds" transform={`translate(${2 * dir},${topY})`}>
        {angles.map((deg, i) => (
          <path
            key={i}
            transform={`rotate(${deg})`}
            d={`M0,0 C-3,-${11 + (i % 3) * 2} -1.5,-${24 + (i % 2) * 4} 0,-${30 + (i % 3) * 3} C1.5,-${24 + (i % 2) * 4} 3,-${11 + (i % 3) * 2} 0,0 Z`}
            fill={fronds[i % 2]}
          />
        ))}
      </g>
    </g>
  )
}
