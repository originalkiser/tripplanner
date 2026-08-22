import { create } from 'zustand'
import { CURRENT_BUILD_ID, fetchDeployedBuildId } from '../lib/version'

const POLL_INTERVAL_MS = 5 * 60 * 1000

interface UpdateState {
  available: boolean
  dismissed: boolean
  startPolling: () => void
  dismiss: () => void
}

let pollingStarted = false

export const useUpdateStore = create<UpdateState>((set, get) => ({
  available: false,
  dismissed: false,

  startPolling: () => {
    if (pollingStarted || !import.meta.env.PROD) return
    pollingStarted = true

    const check = async () => {
      if (get().available) return
      const deployedId = await fetchDeployedBuildId()
      if (deployedId && deployedId !== CURRENT_BUILD_ID) {
        set({ available: true })
      }
    }

    void check()
    setInterval(check, POLL_INTERVAL_MS)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void check()
    })
  },

  dismiss: () => set({ dismissed: true }),
}))
