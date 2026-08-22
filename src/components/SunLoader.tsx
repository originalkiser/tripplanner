const RAY_COUNT = 8

// A small sun-and-rays mark used wherever the app needs a full loading
// screen — the rays spin as a group (see .sun-loader-rays in index.css) and
// the core pulses with the same glow keyframe the hero scene's sun uses.
export function SunLoader({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <g className="sun-loader-rays">
          {Array.from({ length: RAY_COUNT }, (_, i) => (
            <line
              key={i}
              x1="32"
              y1="3"
              x2="32"
              y2="13"
              stroke="var(--color-accent)"
              strokeWidth="3.5"
              strokeLinecap="round"
              transform={`rotate(${(360 / RAY_COUNT) * i} 32 32)`}
            />
          ))}
        </g>
        <circle className="sun-loader-core" cx="32" cy="32" r="13" fill="var(--color-accent)" />
      </svg>
      {label && <p className="text-sm text-text-dim">{label}</p>}
    </div>
  )
}
