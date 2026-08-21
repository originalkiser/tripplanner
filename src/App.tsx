import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { LoginPage } from './features/auth/LoginPage'
import { PeoplePage } from './features/people/PeoplePage'
import { ProfilePage } from './features/profile/ProfilePage'
import { ActivityListPage } from './features/activities/ActivityListPage'
import { DigestPage } from './features/digest/DigestPage'
import { TripAlbumPage } from './features/photos/TripAlbumPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppShell } from './components/layout/AppShell'

// MapLibre GL is the single heaviest dependency — keep it out of the main
// bundle so first load (List/Profile on a phone) stays fast.
const MapPage = lazy(() => import('./features/map/MapPage').then((m) => ({ default: m.MapPage })))

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppShell>
              <Routes>
                <Route path="/" element={<ActivityListPage />} />
                <Route
                  path="/map"
                  element={
                    <Suspense fallback={<div className="p-4 text-sm opacity-60">Loading map…</div>}>
                      <MapPage />
                    </Suspense>
                  }
                />
                <Route path="/digest" element={<DigestPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/people" element={<PeoplePage />} />
                <Route path="/album" element={<TripAlbumPage />} />
              </Routes>
            </AppShell>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
