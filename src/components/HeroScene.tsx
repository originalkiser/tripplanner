// Beach scene backdrop, fixed to the top of the viewport so it never scrolls
// away: sky, a horizon line, water, a couple of palm trees, and a glowing sun
// or moon. Day/night swap is pure CSS (.scene-day / .scene-night, mirroring
// the same data-theme / prefers-color-scheme rules that drive the color
// palette in index.css) so it stays in sync with light/dark mode without any
// JS theme-tracking of its own.
//
// The sky/water wash and the decorative content (sun, trees, clouds/stars)
// are deliberately two separate layers with two different fit strategies,
// because no single strategy works for both across the width range this
// banner has to cover (a phone up to a wide desktop window, at a fixed CSS
// height):
//   - The wash is plain CSS gradients (.scene-bg) that always fill the
//     container edge-to-edge. A gradient stretching to any width looks
//     fine — there's no shape to distort.
//   - The content is SVG using preserveAspectRatio="xMidYMid meet" (contain,
//     centered) — it scales uniformly and is never cropped or stretched.
//     An earlier version used preserveAspectRatio="none" (stretch) to
//     guarantee nothing got cropped on wide windows, which did fix that,
//     but stretched the sun and palm trees into a visibly squashed mess on
//     a real desktop width. "meet" avoids both failure modes.
//   - A single viewBox can't look right across the whole width range (a
//     phone up to a 4K monitor): too narrow and a wide window is mostly
//     bare gradient either side; too wide and every element shrinks to fit
//     a narrow phone. There are three content SVGs instead — mobile,
//     medium, and wide — swapped by a plain CSS media query
//     (.scene-content-mobile/-medium/-wide, see index.css) so each width
//     range gets a scene actually proportioned for it.
//   - Each viewBox's *aspect ratio* is also deliberately chosen relative to
//     the narrowest container it can be shown at in its tier — see the long
//     comment in index.css above `.scene-content-medium`. Get that wrong
//     (as an earlier two-tier version did) and "meet" scales the content
//     down to fit the container's *width* instead of its height, which
//     both shrinks everything and vertically centers it with padding above
//     and below — silently detaching the trees' baseline from the actual
//     horizon drawn by .scene-bg beneath it. baseY={50} below is only
//     correct (sitting exactly on the horizon) when that vertical fit holds.
//
// The day/night swap lives on an inner <g class="scene-visibility"> per
// theme rather than on the <svg> itself, so it can use plain `display:
// block/none` — the outer <svg> only needs display toggled by breakpoint
// (.scene-content-mobile/-medium/-wide). .scene-bg (the gradient wash) needs
// its *own* combined-class day/night rule in index.css, because it's a flex
// container (sky/water flex-basis) and a shared single-class display rule
// there would stomp `display: flex` with `display: block` — that exact bug
// once silently collapsed the sky/water gradient bands to ~0px tall, which
// also meant the "fixed" scene wasn't opaque enough to mask scrolled
// content underneath it.
export function HeroScene() {
  return (
    <div className="scene-fixed">
      <div className="scene-bg scene-day">
        <div className="scene-sky-day" />
        <div className="scene-water-day" />
      </div>
      <div className="scene-bg scene-night">
        <div className="scene-sky-night" />
        <div className="scene-water-night" />
      </div>

      <svg
        className="scene-content scene-content-mobile"
        viewBox="0 0 216 72"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g className="scene-visibility scene-day">
          <circle className="scene-sun" cx="175" cy="16" r="7" fill="#f6b857" />

          <g className="scene-cloud scene-cloud-a" fill="#ffffff" opacity="0.8">
            <ellipse cx="46" cy="16" rx="13" ry="5" />
            <ellipse cx="53" cy="14" rx="9" ry="4.5" />
            <ellipse cx="40" cy="14.5" rx="8" ry="4" />
          </g>
          <g className="scene-cloud scene-cloud-b" fill="#ffffff" opacity="0.7">
            <ellipse cx="113" cy="27" rx="10" ry="4" />
            <ellipse cx="118" cy="25" rx="7" ry="3.5" />
          </g>

          <Palm x={30} baseY={50} height={26} trunk="#6b4a2b" fronds={['#2f6b4f', '#357a59']} />
          <Palm x={186} baseY={50} height={21} trunk="#6b4a2b" fronds={['#357a59', '#2f6b4f']} mirror />
        </g>

        <g className="scene-visibility scene-night">
          <g fill="#eaf2f3">
            {STAR_POSITIONS_MOBILE.map(([sx, sy, r], i) => (
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

          <circle className="scene-sun" cx="175" cy="14" r="6" fill="#eaf2f3" />
          <circle cx="173" cy="12" r="6" fill="#0a1a20" opacity="0.55" />

          <Palm x={30} baseY={50} height={26} trunk="#0a1e24" fronds={['#123038', '#173a44']} />
          <Palm x={186} baseY={50} height={21} trunk="#0a1e24" fronds={['#173a44', '#123038']} mirror />
        </g>
      </svg>

      <svg
        className="scene-content scene-content-medium"
        viewBox="0 0 576 72"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g className="scene-visibility scene-day">
          <circle className="scene-sun" cx="466" cy="16" r="7" fill="#f6b857" />

          <g className="scene-cloud scene-cloud-a" fill="#ffffff" opacity="0.8">
            <ellipse cx="123" cy="16" rx="13" ry="5" />
            <ellipse cx="140" cy="14" rx="9" ry="4.5" />
            <ellipse cx="107" cy="14.5" rx="8" ry="4" />
          </g>
          <g className="scene-cloud scene-cloud-b" fill="#ffffff" opacity="0.7">
            <ellipse cx="302" cy="27" rx="10" ry="4" />
            <ellipse cx="314" cy="25" rx="7" ry="3.5" />
          </g>

          <Palm x={52} baseY={50} height={26} trunk="#6b4a2b" fronds={['#2f6b4f', '#357a59']} />
          <Palm x={524} baseY={50} height={21} trunk="#6b4a2b" fronds={['#357a59', '#2f6b4f']} mirror />
        </g>

        <g className="scene-visibility scene-night">
          <g fill="#eaf2f3">
            {STAR_POSITIONS_MEDIUM.map(([sx, sy, r], i) => (
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

          <circle className="scene-sun" cx="466" cy="14" r="6" fill="#eaf2f3" />
          <circle cx="463" cy="12" r="6" fill="#0a1a20" opacity="0.55" />

          <Palm x={52} baseY={50} height={26} trunk="#0a1e24" fronds={['#123038', '#173a44']} />
          <Palm x={524} baseY={50} height={21} trunk="#0a1e24" fronds={['#173a44', '#123038']} mirror />
        </g>
      </svg>

      <svg
        className="scene-content scene-content-wide"
        viewBox="0 0 900 72"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g className="scene-visibility scene-day">
          <circle className="scene-sun" cx="729" cy="16" r="7" fill="#f6b857" />

          <g className="scene-cloud scene-cloud-a" fill="#ffffff" opacity="0.8">
            <ellipse cx="193" cy="16" rx="13" ry="5" />
            <ellipse cx="219" cy="14" rx="9" ry="4.5" />
            <ellipse cx="167" cy="14.5" rx="8" ry="4" />
          </g>
          <g className="scene-cloud scene-cloud-b" fill="#ffffff" opacity="0.7">
            <ellipse cx="471" cy="27" rx="10" ry="4" />
            <ellipse cx="491" cy="25" rx="7" ry="3.5" />
          </g>
          <g className="scene-cloud scene-cloud-a" fill="#ffffff" opacity="0.65">
            <ellipse cx="612" cy="19" rx="9" ry="3.5" />
            <ellipse cx="624" cy="17.5" rx="6" ry="3" />
          </g>

          <Palm x={81} baseY={50} height={26} trunk="#6b4a2b" fronds={['#2f6b4f', '#357a59']} />
          <Palm x={330} baseY={50} height={17} trunk="#6b4a2b" fronds={['#2f6b4f', '#357a59']} />
          <Palm x={590} baseY={50} height={15} trunk="#6b4a2b" fronds={['#357a59', '#2f6b4f']} mirror />
          <Palm x={849} baseY={50} height={21} trunk="#6b4a2b" fronds={['#357a59', '#2f6b4f']} mirror />
        </g>

        <g className="scene-visibility scene-night">
          <g fill="#eaf2f3">
            {STAR_POSITIONS_WIDE.map(([sx, sy, r], i) => (
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

          <circle className="scene-sun" cx="729" cy="14" r="6" fill="#eaf2f3" />
          <circle cx="726" cy="12" r="6" fill="#0a1a20" opacity="0.55" />

          <Palm x={81} baseY={50} height={26} trunk="#0a1e24" fronds={['#123038', '#173a44']} />
          <Palm x={330} baseY={50} height={17} trunk="#0a1e24" fronds={['#123038', '#173a44']} />
          <Palm x={590} baseY={50} height={15} trunk="#0a1e24" fronds={['#173a44', '#123038']} mirror />
          <Palm x={849} baseY={50} height={21} trunk="#0a1e24" fronds={['#173a44', '#123038']} mirror />
        </g>
      </svg>
    </div>
  )
}

const STAR_POSITIONS_MOBILE: Array<[number, number, number]> = [
  [36, 9, 1],
  [72, 16, 0.8],
  [113, 7, 1.1],
  [139, 19, 0.8],
  [13, 22, 0.9],
  [93, 24, 0.8],
  [157, 10, 0.9],
  [23, 8, 0.7],
  [129, 33, 0.7],
  [80, 30, 0.9],
]

const STAR_POSITIONS_MEDIUM: Array<[number, number, number]> = [
  [96, 9, 1],
  [192, 16, 0.8],
  [302, 7, 1.1],
  [370, 19, 0.8],
  [34, 22, 0.9],
  [247, 24, 0.8],
  [418, 10, 0.9],
  [62, 8, 0.7],
  [343, 33, 0.7],
  [213, 30, 0.9],
]

// Spread across the wider 900-unit wide-tier viewBox so the night sky reads
// as full of stars edge-to-edge rather than clustered in the middle.
const STAR_POSITIONS_WIDE: Array<[number, number, number]> = [
  [150, 9, 1],
  [300, 16, 0.8],
  [471, 7, 1.1],
  [578, 19, 0.8],
  [54, 22, 0.9],
  [386, 24, 0.8],
  [654, 10, 0.9],
  [96, 8, 0.7],
  [536, 33, 0.7],
  [332, 30, 0.9],
  [720, 12, 0.8],
  [800, 20, 0.9],
  [30, 15, 0.7],
  [410, 10, 0.8],
  [500, 25, 0.7],
  [660, 28, 0.8],
  [870, 9, 0.7],
  [250, 12, 0.8],
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
