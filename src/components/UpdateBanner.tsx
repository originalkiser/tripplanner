import { useEffect } from 'react'
import { useUpdateStore } from '../stores/updateStore'

export function UpdateBanner() {
  const { available, dismissed, startPolling, dismiss } = useUpdateStore()

  useEffect(() => {
    startPolling()
  }, [startPolling])

  if (!available || dismissed) return null

  return (
    <div className="fixed inset-x-0 z-40 flex justify-center px-4" style={{ top: 'calc(var(--scene-h) + 8px)' }}>
      <div className="card-shadow flex items-center gap-3 rounded-full bg-primary px-4 py-2 text-sm text-white">
        <span>A new version is ready.</span>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-full bg-white/20 px-3 py-1 font-medium"
        >
          Refresh
        </button>
        <button type="button" onClick={dismiss} aria-label="Dismiss" className="text-lg leading-none opacity-70">
          &times;
        </button>
      </div>
    </div>
  )
}
