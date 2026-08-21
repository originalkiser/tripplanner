import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { useAuthStore } from './stores/authStore'
import { initTheme } from './lib/theme'

initTheme()
void useAuthStore.getState().init()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/tripplanner">
      <App />
    </BrowserRouter>
  </StrictMode>,
)
