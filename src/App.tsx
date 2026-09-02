import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './features/auth/LoginPage'
import { PeoplePage } from './features/people/PeoplePage'
import { ProfilePage } from './features/profile/ProfilePage'
import { ActivityListPage } from './features/activities/ActivityListPage'
import { PackingListPage } from './features/packing/PackingListPage'
import { DigestPage } from './features/digest/DigestPage'
import { TripAlbumPage } from './features/photos/TripAlbumPage'
import { HomePage } from './features/home/HomePage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppShell } from './components/layout/AppShell'
import { SunLoader } from './components/SunLoader'

// Leaflet is the map dependency — keep it out of the main bundle so first
// load (List/Profile on a phone) stays fast.
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
                <Route path="/" element={<HomePage />} />
                <Route path="/planned" element={<ActivityListPage />} />
                {/* Unplanned got folded into Plans; keep old links/bookmarks working. */}
                <Route path="/unplanned" element={<Navigate to="/planned" replace />} />
                <Route path="/packing" element={<PackingListPage />} />
                <Route
                  path="/map"
                  element={
                    <Suspense
                      fallback={
                        <div className="flex h-[calc(100svh-64px)] items-center justify-center">
                          <SunLoader label="Loading map…" />
                        </div>
                      }
                    >
                      <MapPage />
                    </Suspense>
                  }
                />
                <Route path="/digest" element={<DigestPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/people" element={<PeoplePage />} />
                <Route path="/album" element={<TripAlbumPage />} />
                <Route path="/home" element={<HomePage />} />
              </Routes>
            </AppShell>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
