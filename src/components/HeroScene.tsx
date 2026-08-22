// Decorative nautical backdrop, fixed to the top of the viewport so it never
// scrolls away. Day/night swap is pure CSS (.scene-day / .scene-night,
// mirroring the same data-theme / prefers-color-scheme rules that drive the
// color palette in index.css) so it never drifts out of sync with light/dark
// mode and needs no JS theme-tracking of its own.
//
// viewBox is 420x100. Water starts at y=64 (top band ~64px tall); palms are
// planted at that shoreline and reach up past y=10, so the tree silhouette
// (~54px) is taller than the water band itself.
export function HeroScene() {
  return (
    <div className="scene-fixed">
      <svg
        className="scene-day h-full w-full"
        viewBox="0 0 420 100"
        preserveAspectRatio="xMidYMin slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="skyDay" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bee3ec" />
            <stop offset="60%" stopColor="#f7dfb0" />
            <stop offset="100%" stopColor="#f3c989" />
          </linearGradient>
          <linearGradient id="waterDay" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1b7a8c" />
            <stop offset="100%" stopColor="#0f5866" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="420" height="100" fill="url(#skyDay)" />
        <circle className="scene-sun" cx="340" cy="22" r="13" fill="#f6b857" />
        <rect x="0" y="64" width="420" height="36" fill="url(#waterDay)" />
        <g className="scene-dolphin" transform="translate(150,64)">
          <path
            d="M-11,2 C-8,-6 4,-9 11,-2 C7,-3 6,-5 3,-7 C1,-4 -3,-2 -7,-2 C-9,-2 -10,0 -11,2 Z"
            fill="#0f5866"
          />
          <path d="M1,-7 q2,-5 6,-5 q-2,4 -5,6 Z" fill="#0f5866" />
        </g>
        <g className="scene-bird" transform="translate(0,14)">
          <path className="scene-wing" d="M0,0 q5,-6 10,0 q-5,-2 -10,0 Z" fill="#2d5d7b" />
          <path className="scene-wing" d="M0,0 q-5,-6 -10,0 q5,-2 10,0 Z" fill="#2d5d7b" />
        </g>
        <g className="scene-bird b2" transform="translate(0,24)">
          <path className="scene-wing" d="M0,0 q4,-5 8,0 q-4,-1.5 -8,0 Z" fill="#2d5d7b" />
          <path className="scene-wing" d="M0,0 q-4,-5 -8,0 q4,-1.5 8,0 Z" fill="#2d5d7b" />
        </g>
        <PalmDay x={36} height={56} />
        <PalmDay x={392} height={48} />
      </svg>

      <svg
        className="scene-night h-full w-full"
        viewBox="0 0 420 100"
        preserveAspectRatio="xMidYMin slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="skyNight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0b1b24" />
            <stop offset="60%" stopColor="#173445" />
            <stop offset="100%" stopColor="#1f4655" />
          </linearGradient>
          <linearGradient id="waterNight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16323d" />
            <stop offset="100%" stopColor="#0a1e24" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="420" height="100" fill="url(#skyNight)" />
        <g fill="#eaf2f3" opacity="0.6">
          <circle cx="60" cy="14" r="1" />
          <circle cx="120" cy="26" r="0.8" />
          <circle cx="200" cy="10" r="1.1" />
          <circle cx="260" cy="30" r="0.8" />
          <circle cx="20" cy="36" r="0.9" />
          <circle cx="170" cy="40" r="0.8" />
        </g>
        <circle className="scene-sun" cx="340" cy="20" r="10" fill="#eaf2f3" />
        <circle cx="336" cy="17" r="10" fill="#173445" opacity="0.5" />
        <rect x="0" y="64" width="420" height="36" fill="url(#waterNight)" />
        <g className="scene-dolphin" transform="translate(150,64)">
          <path
            d="M-11,2 C-8,-6 4,-9 11,-2 C7,-3 6,-5 3,-7 C1,-4 -3,-2 -7,-2 C-9,-2 -10,0 -11,2 Z"
            fill="#0a1e24"
          />
          <path d="M1,-7 q2,-5 6,-5 q-2,4 -5,6 Z" fill="#0a1e24" />
        </g>
        <g className="scene-bird" transform="translate(0,14)">
          <path className="scene-wing" d="M0,0 q5,-6 10,0 q-5,-2 -10,0 Z" fill="#7fb3d5" />
          <path className="scene-wing" d="M0,0 q-5,-6 -10,0 q5,-2 10,0 Z" fill="#7fb3d5" />
        </g>
        <PalmNight x={36} height={56} />
        <PalmNight x={392} height={48} />
      </svg>

      <div
        className="absolute inset-x-0 bottom-0 h-4"
        style={{
          background: 'linear-gradient(to bottom, transparent, var(--color-bg))',
        }}
      />
    </div>
  )
}

function PalmDay({ x, height }: { x: number; height: number }) {
  return (
    <g className="scene-palm" transform={`translate(${x},64)`}>
      <path
        d={`M0,0 C-2,${-height * 0.4} 3,${-height * 0.7} -2,${-height}`}
        stroke="#6b4a2b"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
      <g className="scene-fronds" transform={`translate(-2,${-height})`}>
        <path d="M0,0 C-16,-6 -26,-1 -31,6" stroke="#2f6b4f" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M0,0 C-13,-14 -14,-24 -11,-32" stroke="#357a59" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M0,0 C-2,-17 4,-26 1,-35" stroke="#2f6b4f" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M0,0 C12,-14 16,-23 14,-32" stroke="#357a59" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M0,0 C17,-5 26,1 30,8" stroke="#2f6b4f" strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
    </g>
  )
}

function PalmNight({ x, height }: { x: number; height: number }) {
  return (
    <g className="scene-palm" transform={`translate(${x},64)`}>
      <path
        d={`M0,0 C-2,${-height * 0.4} 3,${-height * 0.7} -2,${-height}`}
        stroke="#0a1e24"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
      <g className="scene-fronds" transform={`translate(-2,${-height})`}>
        <path d="M0,0 C-16,-6 -26,-1 -31,6" stroke="#123038" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M0,0 C-13,-14 -14,-24 -11,-32" stroke="#173a44" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M0,0 C-2,-17 4,-26 1,-35" stroke="#123038" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M0,0 C12,-14 16,-23 14,-32" stroke="#173a44" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M0,0 C17,-5 26,1 30,8" stroke="#123038" strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
    </g>
  )
}
