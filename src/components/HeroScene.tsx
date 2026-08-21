// Decorative nautical backdrop for the top of the app shell — sky/water
// gradient, a glowing sun or moon, swaying palms, birds flying past, and an
// occasional leaping dolphin. Day/night swap is pure CSS (.scene-day /
// .scene-night, mirroring the same data-theme / prefers-color-scheme rules
// that drive the color palette in index.css) so it never drifts out of sync
// with light/dark mode and needs no JS theme-tracking of its own.
export function HeroScene() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-40 overflow-hidden opacity-60 sm:h-48">
      <svg
        className="scene-day h-full w-full"
        viewBox="0 0 420 200"
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
        <rect x="0" y="0" width="420" height="200" fill="url(#skyDay)" />
        <circle className="scene-sun" cx="330" cy="40" r="26" fill="#f6b857" />
        <rect x="0" y="130" width="420" height="70" fill="url(#waterDay)" />
        <path
          className="scene-dolphin"
          d="M0,145 q18,-30 36,0 q-9,-4 -18,0 q-9,4 -18,0 Z"
          fill="#0f5866"
          transform="translate(150,0)"
        />
        <g className="scene-bird" transform="translate(0,0)">
          <path className="scene-wing" d="M0,0 q6,-8 12,0 q-6,-3 -12,0 Z" fill="#2d5d7b" />
          <path className="scene-wing" d="M0,0 q-6,-8 -12,0 q6,-3 12,0 Z" fill="#2d5d7b" />
        </g>
        <g className="scene-bird b2" transform="translate(0,20)">
          <path className="scene-wing" d="M0,0 q5,-7 10,0 q-5,-2 -10,0 Z" fill="#2d5d7b" />
          <path className="scene-wing" d="M0,0 q-5,-7 -10,0 q5,-2 10,0 Z" fill="#2d5d7b" />
        </g>
        <g className="scene-palm p1" transform="translate(40,135) scale(0.7)">
          <path d="M0,90 q6,-40 -4,-90" stroke="#6b4a2b" strokeWidth="6" fill="none" strokeLinecap="round" />
          <g className="scene-fronds" transform="translate(-4,0)">
            <path d="M-4,0 q-38,-14 -46,-30" stroke="#2f6b4f" strokeWidth="7" fill="none" strokeLinecap="round" />
            <path d="M-4,0 q-30,-24 -30,-44" stroke="#357a59" strokeWidth="7" fill="none" strokeLinecap="round" />
            <path d="M-4,0 q6,-30 -6,-46" stroke="#2f6b4f" strokeWidth="7" fill="none" strokeLinecap="round" />
            <path d="M-4,0 q30,-20 34,-40" stroke="#357a59" strokeWidth="7" fill="none" strokeLinecap="round" />
            <path d="M-4,0 q38,-8 48,-24" stroke="#2f6b4f" strokeWidth="7" fill="none" strokeLinecap="round" />
          </g>
        </g>
        <g className="scene-palm p3" transform="translate(390,145) scale(0.5) translate(-30,0)">
          <path d="M0,90 q-6,-40 4,-90" stroke="#6b4a2b" strokeWidth="6" fill="none" strokeLinecap="round" />
          <g className="scene-fronds" transform="translate(4,0)">
            <path d="M4,0 q38,-14 46,-30" stroke="#357a59" strokeWidth="7" fill="none" strokeLinecap="round" />
            <path d="M4,0 q30,-24 30,-44" stroke="#2f6b4f" strokeWidth="7" fill="none" strokeLinecap="round" />
            <path d="M4,0 q-6,-30 6,-46" stroke="#357a59" strokeWidth="7" fill="none" strokeLinecap="round" />
            <path d="M4,0 q-30,-20 -34,-40" stroke="#2f6b4f" strokeWidth="7" fill="none" strokeLinecap="round" />
          </g>
        </g>
      </svg>

      <svg
        className="scene-night h-full w-full"
        viewBox="0 0 420 200"
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
        <rect x="0" y="0" width="420" height="200" fill="url(#skyNight)" />
        <g fill="#eaf2f3" opacity="0.6">
          <circle cx="60" cy="30" r="1.3" />
          <circle cx="120" cy="55" r="1" />
          <circle cx="200" cy="20" r="1.4" />
          <circle cx="260" cy="65" r="1" />
          <circle cx="20" cy="80" r="1.2" />
          <circle cx="170" cy="88" r="1" />
        </g>
        <circle className="scene-sun" cx="330" cy="38" r="20" fill="#eaf2f3" />
        <circle cx="322" cy="32" r="20" fill="#173445" opacity="0.5" />
        <rect x="0" y="130" width="420" height="70" fill="url(#waterNight)" />
        <path
          className="scene-dolphin"
          d="M0,145 q18,-30 36,0 q-9,-4 -18,0 q-9,4 -18,0 Z"
          fill="#0a1e24"
          transform="translate(150,0)"
        />
        <g className="scene-bird" transform="translate(0,0)">
          <path className="scene-wing" d="M0,0 q6,-8 12,0 q-6,-3 -12,0 Z" fill="#7fb3d5" />
          <path className="scene-wing" d="M0,0 q-6,-8 -12,0 q6,-3 12,0 Z" fill="#7fb3d5" />
        </g>
        <g className="scene-palm p1" transform="translate(40,135) scale(0.7)">
          <path d="M0,90 q6,-40 -4,-90" stroke="#0a1e24" strokeWidth="6" fill="none" strokeLinecap="round" />
          <g className="scene-fronds" transform="translate(-4,0)">
            <path d="M-4,0 q-38,-14 -46,-30" stroke="#123038" strokeWidth="7" fill="none" strokeLinecap="round" />
            <path d="M-4,0 q-30,-24 -30,-44" stroke="#173a44" strokeWidth="7" fill="none" strokeLinecap="round" />
            <path d="M-4,0 q6,-30 -6,-46" stroke="#123038" strokeWidth="7" fill="none" strokeLinecap="round" />
            <path d="M-4,0 q30,-20 34,-40" stroke="#173a44" strokeWidth="7" fill="none" strokeLinecap="round" />
            <path d="M-4,0 q38,-8 48,-24" stroke="#123038" strokeWidth="7" fill="none" strokeLinecap="round" />
          </g>
        </g>
        <g className="scene-palm p3" transform="translate(390,145) scale(0.5) translate(-30,0)">
          <path d="M0,90 q-6,-40 4,-90" stroke="#0a1e24" strokeWidth="6" fill="none" strokeLinecap="round" />
          <g className="scene-fronds" transform="translate(4,0)">
            <path d="M4,0 q38,-14 46,-30" stroke="#173a44" strokeWidth="7" fill="none" strokeLinecap="round" />
            <path d="M4,0 q30,-24 30,-44" stroke="#123038" strokeWidth="7" fill="none" strokeLinecap="round" />
            <path d="M4,0 q-6,-30 6,-46" stroke="#173a44" strokeWidth="7" fill="none" strokeLinecap="round" />
            <path d="M4,0 q-30,-20 -34,-40" stroke="#123038" strokeWidth="7" fill="none" strokeLinecap="round" />
          </g>
        </g>
      </svg>

      <div
        className="absolute inset-x-0 bottom-0 h-16"
        style={{
          background: 'linear-gradient(to bottom, transparent, var(--color-bg))',
        }}
      />
    </div>
  )
}
